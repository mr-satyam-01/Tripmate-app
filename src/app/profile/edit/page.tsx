'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { Upload, User } from 'lucide-react'

export default function EditProfilePage() {
  const router = useRouter()
  const supabase = createClient()
  const [loading, setLoading] = useState(false)
  const [fetching, setFetching] = useState(true)

  // Form State
  const [name, setName] = useState('')
  const [age, setAge] = useState('')
  const [location, setLocation] = useState('')
  const [bio, setBio] = useState('')
  const [interests, setInterests] = useState('')
  const [budgetRange, setBudgetRange] = useState('Budget ($)')
  const [travelStyle, setTravelStyle] = useState('flexible')
  const [lookingFor, setLookingFor] = useState('travel partner')
  const [gender, setGender] = useState('Prefer not to say')
  const [profileImageUrl, setProfileImageUrl] = useState('')
  const [uploadingImage, setUploadingImage] = useState(false)

  useEffect(() => {
    async function loadProfile() {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        const { data } = await supabase.from('users').select('*').eq('id', user.id).single()
        if (data) {
          setName(data.name || '')
          setAge(data.age?.toString() || '')
          setLocation(data.location || '')
          setBio(data.bio || '')
          setInterests(data.interests?.join(', ') || '')
          setBudgetRange(data.budget_range || 'Budget ($)')
          setTravelStyle(data.travel_style || 'flexible')
          setLookingFor(data.looking_for || 'travel partner')
          setGender(data.gender || 'Prefer not to say')
          setProfileImageUrl(data.profile_image_url || '')
        }
      }
      setFetching(false)
    }
    loadProfile()
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    const parsedInterests = interests.split(',').map(s => s.trim()).filter(Boolean)

    const { data: { user } } = await supabase.auth.getUser()
    
    if (user) {
      const { error } = await supabase
        .from('users')
        .upsert({
          id: user.id,
          name: name,
          age: parseInt(age),
          location: location,
          bio: bio,
          budget_range: budgetRange,
          interests: parsedInterests,
          travel_style: travelStyle,
          looking_for: lookingFor,
          gender: gender,
          profile_image_url: profileImageUrl,
        })

      if (error) {
        alert('Failed to save profile: ' + error.message)
      } else {
        router.push('/profile')
      }
    }
    setLoading(false)
  }

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return
    const file = e.target.files[0]
    
    // Basic validation
    if (!file.type.includes('image/jpeg') && !file.type.includes('image/png')) {
      alert('Only JPG and PNG images are allowed.')
      return
    }

    setUploadingImage(true)
    const fileExt = file.name.split('.').pop()
    const fileName = `${Math.random()}.${fileExt}`
    const filePath = `${fileName}`

    const { error: uploadError } = await supabase.storage
      .from('avatars')
      .upload(filePath, file)

    if (uploadError) {
      alert('Error uploading image: ' + uploadError.message)
    } else {
      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath)
      
      setProfileImageUrl(publicUrl)
    }
    setUploadingImage(false)
  }

  if (fetching) {
    return <div className="flex justify-center py-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div></div>
  }

  return (
    <div className="max-w-2xl mx-auto py-8">
      <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Edit Profile</h1>
        <p className="text-gray-500 mb-8">Update your information to get better matches.</p>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
              <input required value={name} onChange={e => setName(e.target.value)} type="text" className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-primary-500 focus:border-primary-500 outline-none" placeholder="Full Name" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Age</label>
              <input required value={age} onChange={e => setAge(e.target.value)} type="number" min="18" className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-primary-500 focus:border-primary-500 outline-none" placeholder="e.g. 25" />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Location</label>
            <input required value={location} onChange={e => setLocation(e.target.value)} type="text" className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-primary-500 focus:border-primary-500 outline-none" placeholder="e.g. New York, USA" />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Bio</label>
            <textarea required value={bio} onChange={e => setBio(e.target.value)} rows={4} className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-primary-500 focus:border-primary-500 resize-none outline-none" placeholder="Tell us about yourself..."></textarea>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Interests (comma separated)</label>
            <input required value={interests} onChange={e => setInterests(e.target.value)} type="text" className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-primary-500 focus:border-primary-500 outline-none" placeholder="Hiking, Photography, Food" />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Budget</label>
              <select value={budgetRange} onChange={e => setBudgetRange(e.target.value)} className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-primary-500 focus:border-primary-500 outline-none bg-white">
                <option value="Budget ($)">Budget ($)</option>
                <option value="Moderate ($$)">Moderate ($$)</option>
                <option value="Luxury ($$$)">Luxury ($$$)</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Travel Style</label>
              <select value={travelStyle} onChange={e => setTravelStyle(e.target.value)} className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-primary-500 focus:border-primary-500 outline-none bg-white">
                <option value="solo">Solo</option>
                <option value="group">Group</option>
                <option value="flexible">Flexible</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Looking For</label>
              <select value={lookingFor} onChange={e => setLookingFor(e.target.value)} className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-primary-500 focus:border-primary-500 outline-none bg-white">
                <option value="travel partner">Travel Partner</option>
                <option value="group">Group</option>
                <option value="local friends">Local Friends</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Gender</label>
            <select value={gender} onChange={e => setGender(e.target.value)} className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-primary-500 focus:border-primary-500 outline-none bg-white">
              <option value="Male">Male</option>
              <option value="Female">Female</option>
              <option value="Prefer not to say">Prefer not to say</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Profile Image</label>
            <div className="flex items-center space-x-6">
              <div className="h-24 w-24 rounded-full bg-gray-100 flex items-center justify-center overflow-hidden border-2 border-gray-200 flex-shrink-0">
                {profileImageUrl ? (
                  <img src={profileImageUrl} alt="Profile" className="h-full w-full object-cover" />
                ) : (
                  <User className="h-10 w-10 text-gray-400" />
                )}
              </div>
              <div className="flex-1">
                <label className="relative cursor-pointer bg-white py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 hover:bg-gray-50 focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-primary-500">
                  <span>{uploadingImage ? 'Uploading...' : 'Upload new image'}</span>
                  <input id="file-upload" name="file-upload" type="file" accept="image/jpeg, image/png" className="sr-only" onChange={handleImageUpload} disabled={uploadingImage} />
                </label>
                <p className="mt-2 text-xs text-gray-500">JPG or PNG. Max 5MB.</p>
              </div>
            </div>
          </div>

          <div className="pt-4">
            <button 
              type="submit" 
              disabled={loading}
              className="w-full bg-primary-600 hover:bg-primary-700 text-white font-medium py-3 px-4 rounded-xl transition-colors shadow-sm disabled:opacity-70"
            >
              {loading ? 'Saving...' : 'Save Profile'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
