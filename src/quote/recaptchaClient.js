let scriptPromise = null

/** Load Google reCAPTCHA v2 API (explicit render). */
export function loadRecaptchaV2Explicit() {
  if (typeof window === 'undefined') return Promise.resolve()
  if (window.grecaptcha?.render) return Promise.resolve()
  if (!scriptPromise) {
    scriptPromise = new Promise((resolve, reject) => {
      const name = '__recaptchaExplicitOnload'
      window[name] = () => {
        delete window[name]
        resolve()
      }
      const s = document.createElement('script')
      s.src = `https://www.google.com/recaptcha/api.js?onload=${name}&render=explicit`
      s.async = true
      s.defer = true
      s.onerror = () => reject(new Error('Could not load reCAPTCHA'))
      document.head.appendChild(s)
    })
  }
  return scriptPromise
}
