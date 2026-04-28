import { User, MapPin } from 'lucide-react'

interface LocalFriendCardProps {
  user: {
    id: string
    name: string | null
    location: string | null
    interests: string[] | null
    profile_image_url: string | null
  }
  onConnect: (id: string) => void
}

export function LocalFriendCard({ user, onConnect }: LocalFriendCardProps) {
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-md transition-shadow">
      <div className="p-6">
        <div className="flex items-center gap-4 mb-4">
          <div className="h-16 w-16 rounded-full overflow-hidden bg-gray-100 flex-shrink-0">
            {user.profile_image_url ? (
              <img src={user.profile_image_url} alt={user.name || 'User'} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-primary-50 text-primary-300">
                <User size={24} />
              </div>
            )}
          </div>
          <div>
            <h3 className="text-lg font-bold text-gray-900 line-clamp-1">{user.name || 'Unknown'}</h3>
            <div className="flex items-center text-sm text-gray-500 mt-0.5">
              <MapPin className="w-3.5 h-3.5 mr-1 text-primary-500" />
              {user.location || 'Unknown location'}
            </div>
          </div>
        </div>

        <div className="mb-6">
          <div className="flex flex-wrap gap-2">
            {user.interests?.slice(0, 3).map((interest, idx) => (
              <span key={idx} className="px-2.5 py-1 bg-gray-50 text-gray-600 text-xs rounded-lg border border-gray-100">
                {interest}
              </span>
            ))}
            {user.interests && user.interests.length > 3 && (
              <span className="px-2.5 py-1 bg-gray-50 text-gray-500 text-xs rounded-lg border border-gray-100">
                +{user.interests.length - 3}
              </span>
            )}
          </div>
        </div>

        <button 
          onClick={() => onConnect(user.id)}
          className="w-full bg-primary-50 hover:bg-primary-100 text-primary-700 font-medium py-2 px-4 rounded-xl transition-colors text-sm"
        >
          Connect
        </button>
      </div>
    </div>
  )
}
