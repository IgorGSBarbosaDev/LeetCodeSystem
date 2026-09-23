import { clsx, type ClassValue } from "clsx"
import type { KeyboardEvent } from "react"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function containDialogFocus(event: KeyboardEvent<HTMLElement>, onClose: () => void) {
  if (event.key === 'Escape') {
    event.preventDefault()
    event.stopPropagation()
    onClose()
    return
  }

  if (event.key !== 'Tab' || event.defaultPrevented) return

  event.stopPropagation()
  const dialog = event.currentTarget
  const focusableElements = Array.from(dialog.querySelectorAll<HTMLElement>(
    'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
  )).filter((element) => element.tabIndex >= 0 && !element.closest('[aria-hidden="true"], [inert]') && element.getClientRects().length > 0)
  const first = focusableElements[0]
  const last = focusableElements[focusableElements.length - 1]
  const activeElement = document.activeElement

  if (!first || !last) {
    event.preventDefault()
    return
  }

  if (event.shiftKey && (activeElement === first || !dialog.contains(activeElement))) {
    event.preventDefault()
    last.focus()
  } else if (!event.shiftKey && (activeElement === last || !dialog.contains(activeElement))) {
    event.preventDefault()
    first.focus()
  }
}
