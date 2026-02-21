/**
 * Database layer - uses PostgreSQL (Supabase) when DATABASE_URL is set,
 * otherwise SQLite for local development.
 * All exports are async.
 */
import dotenv from 'dotenv'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
dotenv.config({ path: path.join(__dirname, '.env') })

const usePg = !!process.env.DATABASE_URL
const impl = usePg ? (await import('./db-pg.js')) : (await import('./db-sqlite.js'))

if (usePg) {
  console.log('Using PostgreSQL (Supabase) database')
} else {
  console.log('Using SQLite database (local)')
}

export const updateUserActive = impl.updateUserActive
export const isUserActive = impl.isUserActive
export const getAllSignups = impl.getAllSignups
export const createSignup = impl.createSignup
export const getSignupByToken = impl.getSignupByToken
export const getSignupByEmail = impl.getSignupByEmail
export const getSignupById = impl.getSignupById
export const updateVerificationToken = impl.updateVerificationToken
export const markSignupVerified = impl.markSignupVerified
export const deleteSignup = impl.deleteSignup
export const addMessage = impl.addMessage
export const getMessagesByUser = impl.getMessagesByUser
export const getMessagesForUser = impl.getMessagesForUser
export const getAllMessages = impl.getAllMessages
export const getFeedPosts = impl.getFeedPosts
export const createFeedPost = impl.createFeedPost
export const updateFeedPost = impl.updateFeedPost
export const deleteFeedPost = impl.deleteFeedPost
export const getFeedPostById = impl.getFeedPostById
export const getAdminStats = impl.getAdminStats
export const getAdminByEmail = impl.getAdminByEmail
export const getAdminById = impl.getAdminById
export const getAllAdmins = impl.getAllAdmins
export const createAdmin = impl.createAdmin
export const getAdminFriends = impl.getAdminFriends
export const addAdminFriend = impl.addAdminFriend
export const areAdminFriends = impl.areAdminFriends
export const getFriends = impl.getFriends
export const addFriend = impl.addFriend
export const removeFriend = impl.removeFriend
export const areFriends = impl.areFriends
export const searchUsers = impl.searchUsers
export const sendFriendRequest = impl.sendFriendRequest
export const getPendingRequestsReceived = impl.getPendingRequestsReceived
export const acceptFriendRequest = impl.acceptFriendRequest
export const rejectFriendRequest = impl.rejectFriendRequest
export const getPendingRequestIdsSent = impl.getPendingRequestIdsSent
export const getPendingRequestIdsReceived = impl.getPendingRequestIdsReceived
export const addDirectMessage = impl.addDirectMessage
export const getDirectMessages = impl.getDirectMessages
export const getGames = impl.getGames
export const getGameById = impl.getGameById
export const createGame = impl.createGame
export const updateGame = impl.updateGame
export const deleteGame = impl.deleteGame
