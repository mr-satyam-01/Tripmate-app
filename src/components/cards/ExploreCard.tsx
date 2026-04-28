import { User } from 'lucide-react'

interface ExploreCardProps {
  user: {
    id: string
    name: string | null
    age: number | null
    location: string | null
    bio: string | null
    interests: string[] | null
    profile_image_url: string | null
  }
  compatibilityScore: number
  onConnect: (id: string) => void
}

export function ExploreCard({ user, compatibilityScore, onConnect }: ExploreCardProps) {
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-md transition-shadow">
      <div className="h-48 bg-gray-100 relative">
        {user.profile_image_url ? (
          <img src={user.profile_image_url} alt={user.name || 'User'} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-primary-50 text-primary-300">
            <User size={64} />
          </div>
        )}
        <div className="absolute top-4 right-4 bg-white/90 backdrop-blur-sm px-3 py-1 rounded-full text-sm font-semibold text-primary-700 shadow-sm">
          {compatibilityScore}% Match
        </div>
      </div>
      
      <div className="p-6">
        <div className="flex justify-between items-start mb-4">
          <div>
            <h3 className="text-xl font-bold text-gray-900">{user.name || 'Unknown'} {user.age && <span className="font-normal text-gray-500">, {user.age}</span>}</h3>
            <p className="text-sm text-gray-500 mt-1">{user.location || 'Location not specified'}</p>
          </div>
        </div>

        {user.bio && (
          <p className="text-gray-600 text-sm line-clamp-2 mb-4">{user.bio}</p>
        )}

        <div className="mb-6">
          <div className="flex flex-wrap gap-2">
            {user.interests?.slice(0, 3).map((interest, idx) => (
              <span key={idx} className="px-3 py-1 bg-gray-50 text-gray-600 text-xs rounded-full border border-gray-200">
                {interest}
              </span>
            ))}
            {user.interests && user.interests.length > 3 && (
              <span className="px-3 py-1 bg-gray-50 text-gray-500 text-xs rounded-full border border-gray-200">
                +{user.interests.length - 3}
              </span>
            )}
          </div>
        </div>

        <div className="flex gap-3 mt-auto">
          <button className="flex-1 bg-gray-50 hover:bg-gray-100 text-gray-700 font-medium py-2 px-4 rounded-xl transition-colors text-sm">
            View Profile
          </button>
          <button 
            onClick={() => onConnect(user.id)}
            className="flex-1 bg-primary-600 hover:bg-primary-700 text-white font-medium py-2 px-4 rounded-xl transition-colors text-sm"
          >
            Send Request
          </button>
        </div>
      </div>
    </div>
  )
}
