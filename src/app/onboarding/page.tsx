'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

export default function OnboardingPage() {
  const router = useRouter()
  const supabase = createClient()
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setLoading(true)

    const formData = new FormData(e.currentTarget)
    const interests = formData.get('interests')?.toString().split(',').map(s => s.trim()) || []

    const { data: { user } } = await supabase.auth.getUser()
    
    if (user) {
      const { error } = await supabase
        .from('users')
        .update({
          age: parseInt(formData.get('age') as string),
          location: formData.get('location') as string,
          bio: formData.get('bio') as string,
          budget_range: formData.get('budget_range') as string,
          interests: interests,
        })
        .eq('id', user.id)

      if (error) {
        alert('Failed to update profile: ' + error.message)
      } else {
        router.push('/explore')
      }
    }
    
    setLoading(false)
  }

  return (
    <div className="max-w-2xl mx-auto py-12">
      <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Complete Your Profile</h1>
        <p className="text-gray-500 mb-8">Tell us a bit about yourself so we can find your perfect travel buddies.</p>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Age</label>
              <input required name="age" type="number" min="18" className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-primary-500 focus:border-primary-500" placeholder="e.g. 25" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Location</label>
              <input required name="location" type="text" className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-primary-500 focus:border-primary-500" placeholder="e.g. New York, USA" />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Bio</label>
            <textarea required name="bio" rows={4} className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-primary-500 focus:border-primary-500 resize-none" placeholder="I love exploring new cultures and trying local foods..."></textarea>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Interests (comma separated)</label>
            <input required name="interests" type="text" className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-primary-500 focus:border-primary-500" placeholder="Hiking, Photography, Food, Museums" />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Budget Range</label>
            <select name="budget_range" className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-primary-500 focus:border-primary-500">
              <option value="Budget ($)">Budget ($)</option>
              <option value="Moderate ($$)">Moderate ($$)</option>
              <option value="Luxury ($$$)">Luxury ($$$)</option>
            </select>
          </div>

          <button 
            type="submit" 
            disabled={loading}
            className="w-full bg-primary-600 hover:bg-primary-700 text-white font-medium py-3 px-4 rounded-xl transition-colors shadow-sm disabled:opacity-70"
          >
            {loading ? 'Saving...' : 'Save & Continue'}
          </button>
        </form>
      </div>
    </div>
  )
}
