import axios from 'axios'

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000'

const api = axios.create({
  baseURL: BASE_URL,
  timeout: 30000,
})

// Request interceptor — attach token if present
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token')
    if (token) {
      config.headers['Authorization'] = `Bearer ${token}`
    }
    return config
  },
  (error) => Promise.reject(error)
)

// Response interceptor — handle 401
api.interceptors.response.use(
  (res) => res,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token')
      window.location.href = '/login'
    }
    return Promise.reject(error)
  }
)

// ─── Auth ─────────────────────────────────────────────────────
export const register = (data) => api.post('/auth/register', data)
export const login = (email, password) => {
  const form = new URLSearchParams()
  form.append('username', email)
  form.append('password', password)
  return api.post('/auth/login', form, { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } })
}
export const getMe = () => api.get('/auth/me')
export const forgotPassword = (email) => api.post('/auth/forgot-password', { email })
export const resetPassword = (token, new_password) => api.post('/auth/reset-password', { token, new_password })

// ─── Listings ─────────────────────────────────────────────────
export const getListings = (params) => api.get('/listings', { params })
export const getListing = (id) => api.get(`/listings/${id}`)
export const getMyListings = () => api.get('/listings/my')
export const createListing = (formData) => api.post('/listings', formData, {
  headers: { 'Content-Type': 'multipart/form-data' }
})
export const updateListing = (id, formData) => api.put(`/listings/${id}`, formData, {
  headers: { 'Content-Type': 'multipart/form-data' }
})
export const deleteListing = (id) => api.delete(`/listings/${id}`)
export const markAsSold = (id, soldPrice) => api.post(`/listings/${id}/sold`, { sold_price: soldPrice })
export const uploadImages = (id, formData) => api.post(`/listings/${id}/images`, formData, {
  headers: { 'Content-Type': 'multipart/form-data' }
})

// ─── Search ───────────────────────────────────────────────────
export const searchListings = (params) => api.get('/search', { params })

// ─── Inquiries ────────────────────────────────────────────────
export const submitInquiry = (data) => api.post('/inquiries', data)
export const getMyInquiries = () => api.get('/inquiries/my')
export const getReceivedInquiries = () => api.get('/inquiries/received')
export const updateInquiryStatus = (id, data) => api.put(`/inquiries/${id}/status`, data)

// ─── Admin ────────────────────────────────────────────────────
export const getAdminListings = () => api.get('/admin/listings')
export const verifyListing = (id) => api.put(`/admin/listings/${id}/verify`)
export const rejectListing = (id) => api.put(`/admin/listings/${id}/reject`)
export const bulkImportListings = (file) => {
  const formData = new FormData()
  formData.append('file', file)
  return api.post('/admin/bulk-import', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  })
}
export const exportTrainingData = () => api.get('/admin/export-training-data', { responseType: 'blob' })
// ─── Chat ───────────────────────────────────────────────────────
export const acceptChatRequest = (inquiryId) => api.post(`/chat/accept-inquiry/${inquiryId}`)
export const getChatRooms = () => api.get('/chat/rooms')
export const getChatMessages = (roomId) => api.get(`/chat/rooms/${roomId}/messages`)
export const sendChatMessage = (roomId, content) => api.post(`/chat/rooms/${roomId}/messages`, { content })

// Utility
export const formatPrice = (price) => {
  if (price >= 10000000) return `₹${(price / 10000000).toFixed(2)} Cr`
  if (price >= 100000) return `₹${(price / 100000).toFixed(2)} L`
  return `₹${price?.toLocaleString('en-IN')}`
}

export default api
