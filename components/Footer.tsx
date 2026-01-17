'use client'

import AdSlot from './AdSlot'

export default function Footer() {
  return (
    <footer className="border-t border-border-color bg-bg-primary py-6 mt-auto">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-center gap-6 flex-wrap">
          <AdSlot 
            type="FOOTER_BRAND" 
            context={{ page: 'home' }}
            className="flex items-center gap-2"
          />
        </div>
        <div className="text-center text-xs text-text-secondary mt-4">
          © {new Date().getFullYear()} VAY-MASTER. Все права защищены.
        </div>
      </div>
    </footer>
  )
}
