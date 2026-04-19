from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from uuid import UUID

from db.database import get_db
from models.chat import ChatRoom, ChatMessage
from models.inquiry import Inquiry, InquiryStatus
from models.listing import Listing
from routers.auth import get_current_user
from pydantic import BaseModel
from datetime import datetime

router = APIRouter()

class MessageCreate(BaseModel):
    content: str

class MessageResponse(BaseModel):
    id: UUID
    sender_id: UUID
    content: str
    created_at: datetime
    
    class Config:
        from_attributes = True

class ChatRoomResponse(BaseModel):
    id: UUID
    listing_id: UUID
    listing_title: str
    other_party_name: str
    last_message: str = ""
    updated_at: datetime
    
    class Config:
        from_attributes = True

@router.post("/accept-inquiry/{inquiry_id}", response_model=ChatRoomResponse)
def accept_inquiry_and_start_chat(
    inquiry_id: UUID,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    if current_user.role != "client":
        raise HTTPException(status_code=403, detail="Only owners can accept inquiries")
    
    inquiry = db.query(Inquiry).filter(Inquiry.id == inquiry_id).first()
    if not inquiry:
        raise HTTPException(status_code=404, detail="Inquiry not found")
    
    listing = db.query(Listing).filter(Listing.id == inquiry.listing_id).first()
    if listing.client_id != current_user.id:
        raise HTTPException(status_code=403, detail="You do not own this listing")
    
    # Check if room already exists
    room = db.query(ChatRoom).filter(
        ChatRoom.listing_id == listing.id,
        ChatRoom.customer_id == inquiry.customer_id,
        ChatRoom.client_id == current_user.id
    ).first()
    
    if not room:
        room = ChatRoom(
            listing_id=listing.id,
            customer_id=inquiry.customer_id,
            client_id=current_user.id
        )
        db.add(room)
        db.flush() # Ensure room.id is populated
        
        # Add initial message from the inquiry
        initial_msg = ChatMessage(
            room_id=room.id,
            sender_id=inquiry.customer_id,
            content=inquiry.message
        )
        db.add(initial_msg)
    
    inquiry.status = InquiryStatus.accepted
    db.commit()
    db.refresh(room)
    
    return {
        "id": room.id,
        "listing_id": listing.id,
        "listing_title": listing.title,
        "other_party_name": inquiry.customer.full_name,
        "last_message": inquiry.message,
        "updated_at": room.created_at
    }

@router.get("/rooms", response_model=List[ChatRoomResponse])
def get_chat_rooms(
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    if current_user.role == "client":
        rooms = db.query(ChatRoom).filter(ChatRoom.client_id == current_user.id).all()
    else:
        rooms = db.query(ChatRoom).filter(ChatRoom.customer_id == current_user.id).all()
    
    res = []
    for r in rooms:
        other_party = r.customer if current_user.role == "client" else r.client
        last_msg = db.query(ChatMessage).filter(ChatMessage.room_id == r.id).order_by(ChatMessage.created_at.desc()).first()
        res.append({
            "id": r.id,
            "listing_id": r.listing_id,
            "listing_title": r.listing.title,
            "other_party_name": other_party.full_name,
            "last_message": last_msg.content if last_msg else "",
            "updated_at": last_msg.created_at if last_msg else r.created_at
        })
    return res

@router.get("/rooms/{room_id}/messages", response_model=List[MessageResponse])
def get_messages(
    room_id: UUID,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    room = db.query(ChatRoom).filter(ChatRoom.id == room_id).first()
    if not room:
        raise HTTPException(status_code=404, detail="Room not found")
    
    if current_user.id not in [room.customer_id, room.client_id]:
        raise HTTPException(status_code=403, detail="Not authorized to view these messages")
    
    messages = db.query(ChatMessage).filter(ChatMessage.room_id == room_id).order_by(ChatMessage.created_at.asc()).all()
    return messages

@router.post("/rooms/{room_id}/messages", response_model=MessageResponse)
def send_message(
    room_id: UUID,
    msg_in: MessageCreate,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    room = db.query(ChatRoom).filter(ChatRoom.id == room_id).first()
    if not room:
        raise HTTPException(status_code=404, detail="Room not found")
    
    if current_user.id not in [room.customer_id, room.client_id]:
        raise HTTPException(status_code=403, detail="Not authorized to send messages to this room")
    
    new_msg = ChatMessage(
        room_id=room_id,
        sender_id=current_user.id,
        content=msg_in.content
    )
    db.add(new_msg)
    db.commit()
    db.refresh(new_msg)
    return new_msg
