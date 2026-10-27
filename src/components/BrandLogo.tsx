import React from 'react'

interface BrandLogoProps {
  className?: string
  isDarkMode?: boolean
}

export const BrandLogo: React.FC<BrandLogoProps> = ({ className = '', isDarkMode = false }) => (
  isDarkMode
    ? <span className={`brand-logo-salmon ${className}`} role="img" aria-label="AUREL" />
    : <img src="/aurel-logo.png" alt="AUREL" className={className} />
)
