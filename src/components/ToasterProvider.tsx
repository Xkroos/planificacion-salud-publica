'use client'

import { Toaster, ToastBar } from 'react-hot-toast'

export function ToasterProvider() {
  return (
    <Toaster position="bottom-right">
      {(t) => (
        <div
          style={{
            animation: t.visible ? 'bounceInRight 0.8s cubic-bezier(0.215, 0.61, 0.355, 1) forwards' : 'fadeOutRight 0.5s forwards'
          }}
        >
          <ToastBar toast={t} />
        </div>
      )}
    </Toaster>
  )
}
