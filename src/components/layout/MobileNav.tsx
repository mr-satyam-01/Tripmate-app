'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Compass, Users, MapPin, Briefcase, MessageSquare } from 'lucide-react'

export function MobileNav() {
  const pathname = usePathname()

  const navItems = [
    { name: 'Explore', href: '/explore', icon: Compass },
    { name: 'Groups', href: '/group-trips', icon: Users },
    { name: 'Locals', href: '/local-friends', icon: MapPin },
    { name: 'My Trips', href: '/my-trips', icon: Briefcase },
    { name: 'Chat', href: '/chat', icon: MessageSquare },
  ]

  // Only show if we're not on auth routes or landing page
  if (['/', '/login', '/signup', '/onboarding'].includes(pathname)) return null;

  return (
    <div className="sm:hidden fixed bottom-0 w-full bg-white border-t border-gray-100 z-50 pb-safe shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]">
      <div className="flex justify-around items-center h-16 px-2">
        {navItems.map((item) => {
          const Icon = item.icon
          const isActive = pathname.startsWith(item.href)

          return (
            <Link
              key={item.name}
              href={item.href}
              className={`flex flex-col items-center justify-center w-full h-full space-y-1 transition-colors ${
                isActive ? 'text-primary-600' : 'text-gray-500 hover:text-gray-900'
              }`}
            >
              <Icon className={`w-6 h-6 ${isActive ? 'fill-primary-50 stroke-primary-600' : 'stroke-2'}`} />
              <span className={`text-[10px] font-medium ${isActive ? 'text-primary-700 font-bold' : ''}`}>
                {item.name}
              </span>
            </Link>
          )
        })}
      </div>
    </div>
  )
}
