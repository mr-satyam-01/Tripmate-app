'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { LogOut, SlidersHorizontal, User } from 'lucide-react'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'

export function Navbar() {
  const pathname = usePathname()
  const router = useRouter()
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const [filterOpen, setFilterOpen] = useState(false)
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null)
  
  // Filter states
  const [fWomenOnly, setFWomenOnly] = useState(false)
  const [fVerified, setFVerified] = useState(false)
  const [fLocation, setFLocation] = useState('')
  const [fBudget, setFBudget] = useState('')
  const [fInterests, setFInterests] = useState('')

  const supabase = createClient()

  // Initialize filters from URL if on client
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search)
      setFWomenOnly(params.get('gender') === 'female')
      setFVerified(params.get('verified') === 'true')
      setFLocation(params.get('location') || '')
      setFBudget(params.get('budget') || '')
      setFInterests(params.get('interests') || '')
    }
  }, [pathname])

  useEffect(() => {
    async function loadUser() {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        const { data } = await supabase.from('users').select('profile_image_url').eq('id', user.id).single()
        if (data?.profile_image_url) {
          setAvatarUrl(data.profile_image_url)
        }
      }
    }
    loadUser()
  }, [])

  const handleLogout = async () => {
    await supabase.auth.signOut()
    window.location.href = '/login'
  }

  const applyFilters = () => {
    const params = new URLSearchParams()
    if (fWomenOnly) params.set('gender', 'female')
    if (fVerified) params.set('verified', 'true')
    if (fLocation) params.set('location', fLocation)
    if (fBudget) params.set('budget', fBudget)
    if (fInterests) params.set('interests', fInterests)
    
    setFilterOpen(false)
    router.push('/explore?' + params.toString(), { scroll: false })
  }

  const clearFilters = () => {
    setFWomenOnly(false)
    setFVerified(false)
    setFLocation('')
    setFBudget('')
    setFInterests('')
    setFilterOpen(false)
    router.push('/explore', { scroll: false })
  }

  const isActive = (path: string) => pathname === path

  return (
    <nav className="sticky top-0 z-50 bg-white border-b border-gray-100 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex">
            <div className="flex-shrink-0 flex items-center">
              <Link href="/explore" className="text-xl font-bold text-primary-600 tracking-tight">
                TripMate
              </Link>
            </div>
            <div className="hidden sm:ml-8 sm:flex sm:space-x-8">
              <Link
                href="/explore"
                className={`inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium ${
                  isActive('/explore')
                    ? 'border-primary-500 text-gray-900'
                    : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
                }`}
              >
                Explore
              </Link>
              <Link
                href="/group-trips"
                className={`inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium ${
                  isActive('/group-trips')
                    ? 'border-primary-500 text-gray-900'
                    : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
                }`}
              >
                Group Trips
              </Link>
              <Link
                href="/local-friends"
                className={`inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium ${
                  isActive('/local-friends')
                    ? 'border-primary-500 text-gray-900'
                    : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
                }`}
              >
                Local Friends
              </Link>
            </div>
          </div>
          <div className="hidden sm:ml-6 sm:flex sm:items-center space-x-4">
            <Link
              href="/my-trips"
              className="text-sm font-medium text-gray-500 hover:text-gray-900 px-3 py-2 rounded-md hover:bg-gray-50 transition-colors"
            >
              My Trips
            </Link>
            <div className="relative">
              <button 
                onClick={() => setFilterOpen(!filterOpen)}
                className={`p-2 transition-colors rounded-full ${filterOpen ? 'bg-primary-50 text-primary-600' : 'text-gray-400 hover:text-gray-500'}`}
              >
                <SlidersHorizontal className="h-5 w-5" />
              </button>
              
              {filterOpen && (
                <div className="origin-top-right absolute right-0 mt-2 w-72 rounded-2xl shadow-xl py-4 px-5 bg-white ring-1 ring-black ring-opacity-5 focus:outline-none z-50 transition-all duration-200 border border-gray-100">
                  <h3 className="font-bold text-gray-900 border-b border-gray-100 pb-2 mb-4">Filters</h3>
                  
                  <div className="space-y-4">
                    <label className="flex items-center cursor-pointer">
                      <div className="relative">
                        <input type="checkbox" className="sr-only" checked={fWomenOnly} onChange={(e) => setFWomenOnly(e.target.checked)} />
                        <div className={`block w-10 h-6 rounded-full transition-colors ${fWomenOnly ? 'bg-primary-500' : 'bg-gray-200'}`}></div>
                        <div className={`dot absolute left-1 top-1 bg-white w-4 h-4 rounded-full transition-transform ${fWomenOnly ? 'transform translate-x-4' : ''}`}></div>
                      </div>
                      <div className="ml-3 text-sm font-medium text-gray-700">Women only</div>
                    </label>

                    <label className="flex items-center cursor-pointer">
                      <div className="relative">
                        <input type="checkbox" className="sr-only" checked={fVerified} onChange={(e) => setFVerified(e.target.checked)} />
                        <div className={`block w-10 h-6 rounded-full transition-colors ${fVerified ? 'bg-primary-500' : 'bg-gray-200'}`}></div>
                        <div className={`dot absolute left-1 top-1 bg-white w-4 h-4 rounded-full transition-transform ${fVerified ? 'transform translate-x-4' : ''}`}></div>
                      </div>
                      <div className="ml-3 text-sm font-medium text-gray-700">Verified users only</div>
                    </label>

                    <div>
                      <label className="block text-xs font-medium text-gray-500 mb-1">Location</label>
                      <input type="text" value={fLocation} onChange={(e) => setFLocation(e.target.value)} placeholder="e.g. Paris" className="w-full text-sm px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500" />
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-gray-500 mb-1">Budget</label>
                      <select value={fBudget} onChange={(e) => setFBudget(e.target.value)} className="w-full text-sm px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:border-primary-500 bg-white">
                        <option value="">Any Budget</option>
                        <option value="Budget ($)">Budget ($)</option>
                        <option value="Moderate ($$)">Moderate ($$)</option>
                        <option value="Luxury ($$$)">Luxury ($$$)</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-gray-500 mb-1">Interests</label>
                      <input type="text" value={fInterests} onChange={(e) => setFInterests(e.target.value)} placeholder="e.g. Hiking, Food" className="w-full text-sm px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500" />
                    </div>

                    <div className="pt-2 flex gap-2">
                      <button onClick={clearFilters} className="flex-1 py-2 px-3 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-50 font-medium rounded-lg transition-colors border border-gray-200">
                        Clear
                      </button>
                      <button onClick={applyFilters} className="flex-1 py-2 px-3 text-sm text-white bg-primary-600 hover:bg-primary-700 font-medium rounded-lg transition-colors shadow-sm">
                        Apply
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
            <div className="relative">
              <button
                onClick={() => setDropdownOpen(!dropdownOpen)}
                className="flex text-sm border-2 border-transparent rounded-full focus:outline-none focus:border-gray-300 transition"
              >
                <div className="h-8 w-8 rounded-full bg-primary-100 flex items-center justify-center text-primary-700 overflow-hidden">
                  {avatarUrl ? (
                    <img src={avatarUrl} alt="Profile" className="h-full w-full object-cover" />
                  ) : (
                    <User className="h-5 w-5" />
                  )}
                </div>
              </button>
              {dropdownOpen && (
                <div className="origin-top-right absolute right-0 mt-2 w-48 rounded-md shadow-lg py-1 bg-white ring-1 ring-black ring-opacity-5 focus:outline-none transition-all duration-200">
                  <Link href="/profile" className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors">
                    View Profile
                  </Link>
                  <Link href="/profile/edit" className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors">
                    Edit Profile
                  </Link>
                  <button
                    onClick={handleLogout}
                    className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex items-center">
                      <LogOut className="h-4 w-4 mr-2" />
                      Sign out
                    </div>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </nav>
  )
}
