import { useState, type InputHTMLAttributes } from 'react'
import { Eye, EyeOff } from 'lucide-react'

type PasswordInputProps = Omit<InputHTMLAttributes<HTMLInputElement>, 'type'>

export default function PasswordInput({ className = '', ...props }: PasswordInputProps) {
  const [isVisible, setIsVisible] = useState(false)

  return (
    <div className="relative">
      <input
        {...props}
        type={isVisible ? 'text' : 'password'}
        className={`${className} pr-12`}
      />
      <button
        type="button"
        aria-label={isVisible ? 'Hide password' : 'Show password'}
        aria-pressed={isVisible}
        onClick={() => setIsVisible(visible => !visible)}
        className="password-eye-toggle absolute inset-y-0 right-0 flex w-11 items-center justify-center rounded-r-xl text-[#8E7973] transition-colors hover:text-[#B36D6D] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#B36D6D]"
      >
        {isVisible
          ? <EyeOff className="h-4 w-4" aria-hidden="true" />
          : <Eye className="h-4 w-4" aria-hidden="true" />}
      </button>
    </div>
  )
}
