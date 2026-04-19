import React, { useState, useEffect, useRef } from 'react'
import { getChatRooms, getChatMessages, sendChatMessage } from '../api/client'
import { useAuth } from '../context/AuthContext'
import toast from 'react-hot-toast'
import { FiSend, FiMessageSquare, FiHome, FiUser, FiArrowLeft, FiMoreVertical, FiSearch } from 'react-icons/fi'

export default function Chat() {
  const { user } = useAuth()
  const [rooms, setRooms] = useState([])
  const [activeRoom, setActiveRoom] = useState(null)
  const [messages, setMessages] = useState([])
  const [newMessage, setNewMessage] = useState('')
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const messagesEndRef = useRef(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }

  useEffect(() => {
    getChatRooms()
      .then(res => {
        setRooms(res.data)
        if (res.data.length > 0) {
          setActiveRoom(res.data[0])
        }
      })
      .catch(() => toast.error('Failed to load chats'))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    if (activeRoom) {
      getChatMessages(activeRoom.id)
        .then(res => setMessages(res.data))
        .catch(() => toast.error('Failed to load messages'))
    }
  }, [activeRoom])

  useEffect(scrollToBottom, [messages])

  // Polling for new messages every 4 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      if (activeRoom) {
        getChatMessages(activeRoom.id).then(res => {
          // Only update if message count changed to avoid jumpy UI
          if (res.data.length !== messages.length) {
             setMessages(res.data)
          }
        })
      }
    }, 4000)
    return () => clearInterval(interval)
  }, [activeRoom, messages.length])

  const handleSendMessage = async (e) => {
    e.preventDefault()
    if (!newMessage.trim() || !activeRoom) return
    
    const content = newMessage
    setNewMessage('')
    
    try {
      const res = await sendChatMessage(activeRoom.id, content)
      setMessages(prev => [...prev, res.data])
    } catch {
      toast.error('Failed to send message')
      setNewMessage(content)
    }
  }

  const filteredRooms = rooms.filter(r => 
    r.other_party_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    r.listing_title.toLowerCase().includes(searchQuery.toLowerCase())
  )

  if (loading) return <div className="loading-screen"><div className="spinner" /></div>

  return (
    <div className="page" style={{ height: 'calc(100vh - 100px)', padding: '1rem 0', background: 'var(--surface)' }}>
      <div className="container" style={{ 
        height: '100%', 
        display: 'grid', 
        gridTemplateColumns: '360px 1fr', 
        gap: '0', 
        background: 'var(--surface-container-lowest)',
        borderRadius: 'var(--radius-xl)',
        overflow: 'hidden',
        boxShadow: '0 20px 60px -20px rgba(0,0,0,0.15)',
        border: '1px solid var(--outline-variant)'
      }}>
        
        {/* Sidebar: Conversations */}
        <div style={{ 
          borderRight: '1px solid var(--outline-variant)', 
          display: 'flex', 
          flexDirection: 'column',
          background: 'linear-gradient(to bottom, #ffffff, #f8fafc)'
        }}>
          <div style={{ padding: '2rem 1.5rem 1rem' }}>
            <h2 style={{ fontSize: 'var(--text-xl)', fontWeight: 800, marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <FiMessageSquare color="var(--primary)" /> Messages
            </h2>
            <div style={{ position: 'relative' }}>
              <FiSearch style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--on-surface-variant)', opacity: 0.5 }} />
              <input 
                type="text" 
                placeholder="Search conversations..." 
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                style={{
                  width: '100%',
                  padding: '0.75rem 1rem 0.75rem 2.5rem',
                  borderRadius: 'var(--radius-md)',
                  background: 'var(--surface-container-low)',
                  border: '1px solid transparent',
                  fontSize: 'var(--text-sm)',
                  transition: 'var(--transition)'
                }}
                onFocus={e => e.target.style.borderColor = 'var(--primary)'}
                onBlur={e => e.target.style.borderColor = 'transparent'}
              />
            </div>
          </div>

          <div style={{ flex: 1, overflowY: 'auto', padding: '0.5rem' }}>
            {filteredRooms.length === 0 ? (
              <div style={{ padding: '3rem 2rem', textAlign: 'center', color: 'var(--on-surface-variant)', opacity: 0.6 }}>
                <div style={{ fontSize: '2rem', marginBottom: '1rem' }}>💬</div>
                <p style={{ fontSize: 'var(--text-sm)' }}>No conversations found</p>
              </div>
            ) : filteredRooms.map(room => (
              <div 
                key={room.id} 
                onClick={() => setActiveRoom(room)}
                style={{
                  padding: '1.25rem 1rem',
                  borderRadius: 'var(--radius-md)',
                  marginBottom: '0.25rem',
                  cursor: 'pointer',
                  background: activeRoom?.id === room.id ? 'var(--surface-container)' : 'transparent',
                  transition: 'var(--transition)',
                  position: 'relative',
                  display: 'flex',
                  gap: '0.875rem',
                  alignItems: 'center'
                }}
                onMouseEnter={e => { if (activeRoom?.id !== room.id) e.currentTarget.style.background = 'rgba(0,0,0,0.02)' }}
                onMouseLeave={e => { if (activeRoom?.id !== room.id) e.currentTarget.style.background = 'transparent' }}
              >
                <div style={{ 
                  width: 48, height: 48, borderRadius: '50%', 
                  background: activeRoom?.id === room.id ? 'var(--primary)' : 'var(--surface-container-high)',
                  color: activeRoom?.id === room.id ? 'white' : 'var(--on-surface)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: '1.1rem',
                  flexShrink: 0, transition: 'var(--transition)'
                }}>
                  {room.other_party_name[0]}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 2 }}>
                    <span style={{ fontWeight: 700, fontSize: 'var(--text-sm)', color: 'var(--on-surface)' }}>{room.other_party_name}</span>
                    <span style={{ fontSize: '10px', color: 'var(--on-surface-variant)', opacity: 0.7 }}>
                      {new Date(room.updated_at).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                    </span>
                  </div>
                  <div style={{ fontSize: '11px', color: 'var(--tertiary)', fontWeight: 600, marginBottom: 4, display: 'flex', alignItems: 'center', gap: 4 }}>
                    <FiHome size={10} /> {room.listing_title}
                  </div>
                  <div style={{ 
                    fontSize: 'var(--text-xs)', 
                    color: 'var(--on-surface-variant)', 
                    overflow: 'hidden', 
                    textOverflow: 'ellipsis', 
                    whiteSpace: 'nowrap',
                    opacity: activeRoom?.id === room.id ? 1 : 0.7
                  }}>
                    {room.last_message}
                  </div>
                </div>
                {activeRoom?.id === room.id && (
                  <div style={{ width: 4, height: 24, background: 'var(--primary)', borderRadius: '0 4px 4px 0', position: 'absolute', left: 0 }} />
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Chat Area */}
        <div style={{ display: 'flex', flexDirection: 'column', background: '#fff' }}>
          {activeRoom ? (
            <>
              {/* Chat Header */}
              <div style={{ 
                padding: '1.25rem 2rem', 
                borderBottom: '1px solid var(--outline-variant)', 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'space-between',
                background: 'rgba(255,255,255,0.8)',
                backdropFilter: 'blur(10px)'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                  <div style={{ width: 44, height: 44, borderRadius: '50%', background: 'var(--gradient-primary)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: '1.1rem' }}>
                    {activeRoom.other_party_name[0]}
                  </div>
                  <div>
                    <div style={{ fontWeight: 800, fontSize: 'var(--text-base)' }}>{activeRoom.other_party_name}</div>
                    <div style={{ fontSize: '11px', color: 'var(--on-surface-variant)', display: 'flex', alignItems: 'center', gap: 4 }}>
                      <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#10D9A4' }} /> Online
                    </div>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '1rem', color: 'var(--on-surface-variant)' }}>
                   <FiMoreVertical size={20} style={{ cursor: 'pointer' }} />
                </div>
              </div>

              {/* Messages Area */}
              <div style={{ 
                flex: 1, 
                overflowY: 'auto', 
                padding: '2rem', 
                display: 'flex', 
                flexDirection: 'column', 
                gap: '1.25rem',
                background: '#fcfdfe'
              }}>
                {messages.length === 0 ? (
                  <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', opacity: 0.3 }}>
                    <FiMessageSquare size={48} />
                    <p>No messages yet. Say hi!</p>
                  </div>
                ) : messages.map((msg, idx) => {
                  const isMe = msg.sender_id === user.id
                  const showTime = idx === 0 || new Date(msg.created_at) - new Date(messages[idx-1].created_at) > 300000
                  
                  return (
                    <React.Fragment key={msg.id}>
                      {showTime && (
                        <div style={{ alignSelf: 'center', fontSize: '10px', color: 'var(--on-surface-variant)', background: 'var(--surface-container-low)', padding: '4px 12px', borderRadius: '12px', margin: '1rem 0', fontWeight: 600 }}>
                          {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </div>
                      )}
                      <div style={{ 
                        maxWidth: '65%', 
                        alignSelf: isMe ? 'flex-end' : 'flex-start',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: isMe ? 'flex-end' : 'flex-start'
                      }}>
                        <div style={{ 
                          padding: '0.875rem 1.25rem', 
                          borderRadius: isMe ? '20px 20px 4px 20px' : '20px 20px 20px 4px',
                          background: isMe ? 'var(--primary)' : '#fff',
                          color: isMe ? 'white' : 'var(--on-surface)',
                          boxShadow: isMe ? '0 4px 15px rgba(15,23,42,0.15)' : '0 4px 15px rgba(0,0,0,0.05)',
                          border: isMe ? 'none' : '1px solid var(--outline-variant)',
                          fontSize: '14px',
                          lineHeight: 1.5,
                          fontWeight: 500
                        }}>
                          {msg.content}
                        </div>
                      </div>
                    </React.Fragment>
                  )
                })}
                <div ref={messagesEndRef} />
              </div>

              {/* Input Area */}
              <div style={{ padding: '1.5rem 2rem 2rem' }}>
                <form 
                  onSubmit={handleSendMessage} 
                  style={{ 
                    display: 'flex', 
                    gap: '0.75rem', 
                    background: 'var(--surface-container-low)',
                    padding: '0.5rem',
                    borderRadius: 'var(--radius-round)',
                    border: '1px solid var(--outline-variant)',
                    boxShadow: '0 2px 10px rgba(0,0,0,0.03)'
                  }}
                >
                  <input 
                    type="text" 
                    value={newMessage}
                    onChange={e => setNewMessage(e.target.value)}
                    placeholder="Type a message..."
                    style={{ 
                      flex: 1, 
                      background: 'transparent', 
                      padding: '0.5rem 1rem',
                      fontSize: '14px',
                      fontWeight: 500
                    }}
                  />
                  <button 
                    type="submit" 
                    className="btn btn-primary" 
                    style={{ 
                      borderRadius: '50%', 
                      width: 42, 
                      height: 42, 
                      padding: 0, 
                      justifyContent: 'center',
                      background: 'var(--primary)',
                      boxShadow: '0 4px 12px rgba(15,23,42,0.2)'
                    }}
                  >
                    <FiSend size={18} />
                  </button>
                </form>
              </div>
            </>
          ) : (
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: '#f8fafc' }}>
              <div style={{ 
                width: 120, height: 120, borderRadius: '50%', 
                background: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center',
                boxShadow: '0 10px 30px rgba(0,0,0,0.05)', marginBottom: '2rem'
              }}>
                <FiMessageSquare size={48} color="var(--primary)" style={{ opacity: 0.2 }} />
              </div>
              <h2 style={{ fontSize: 'var(--text-2xl)', fontWeight: 800, color: 'var(--on-surface)', marginBottom: '0.5rem' }}>Your Conversations</h2>
              <p style={{ color: 'var(--on-surface-variant)', textAlign: 'center', maxWidth: 300, fontSize: 'var(--text-sm)' }}>
                Select a message from the left to start chatting with property owners or customers.
              </p>
            </div>
          )}
        </div>

      </div>
    </div>
  )
}
