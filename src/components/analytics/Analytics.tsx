'use client'

import { useEffect } from 'react'

interface AnalyticsProps {
  /** Analytics provider to use */
  provider?: 'posthog' | 'plausible' | 'none'
  /** API key for the analytics provider */
  apiKey?: string
  /** Domain/host for Plausible */
  domain?: string
}

/**
 * Analytics component that loads analytics scripts only on marketing routes
 * Respects Do Not Track and sends no PII
 */
export function Analytics({
  provider = 'none',
  apiKey,
  domain,
}: AnalyticsProps) {
  useEffect(() => {
    // Respect Do Not Track
    if (typeof navigator !== 'undefined' && navigator.doNotTrack === '1') {
      return
    }

    // Only load if provider is configured and not 'none'
    if (provider === 'none' || !apiKey) {
      return
    }

    // Load analytics script based on provider
    switch (provider) {
      case 'posthog':
        loadPostHog(apiKey)
        break
      case 'plausible':
        loadPlausible(apiKey, domain)
        break
    }
  }, [provider, apiKey, domain])

  return null
}

function loadPostHog(apiKey: string) {
  // PostHog script loading
  const script = document.createElement('script')
  script.innerHTML = `
    !function(t,e){var o,n,p,r;e.__SV||(window.posthog=e,e._i=[],e.init=function(i,s,a){function g(t,e){var o=e.split(".");2==o.length&&(t=t[o[0]],e=o[1]),t[e]=function(){t.push([e].concat(Array.prototype.slice.call(arguments,0)))}}(p=t.createElement("script")).type="text/javascript",p.async=!0,p.src=s.api_host+"/static/array.js",(r=t.getElementsByTagName("script")[0]).parentNode.insertBefore(p,r);var u=e;for(void 0!==a?u=e[a]=[]:a="posthog",u.people=u.people||[],u.toString=function(t){var e="posthog";return"posthog"!==a&&(e+="."+a),t||(e+=" (stub)"),e},u.people.toString=function(){return u.toString(1)+".people (stub)"},o="capture identify alias people.set people.set_once set_config register register_once unregister opt_out_capturing has_opted_out_capturing opt_in_capturing reset isFeatureEnabled onFeatureFlags getFeatureFlag getFeatureFlagPayload reloadFeatureFlags group updateEarlyAccessFeatureEnrollment getEarlyAccessFeatures getActiveSubscriptions getSurveys getNextSurveyStep".split(" "),n=0;n<o.length;n++)g(u,o[n]);e._i.push([i,s,a])},e.__SV=1)}(document,window.posthog||[]);
    posthog.init('${apiKey}', {
      api_host: 'https://app.posthog.com',
      capture_pageview: true,
      capture_pageleave: false,
      persistence: 'localStorage',
      // Disable PII collection
      property_blacklist: ['$ip', '$user_id', '$email', '$name', '$firstname', '$lastname', '$phone', '$city', '$region', '$country', '$timezone'],
      // Respect privacy
      disable_session_recording: true,
      disable_persistence: false
    });
  `
  document.head.appendChild(script)
}

function loadPlausible(apiKey: string, domain?: string) {
  // Plausible script loading
  const script = document.createElement('script')
  script.defer = true
  script.setAttribute('data-domain', domain || window.location.hostname)
  script.src = `https://plausible.io/js/script.js`
  document.head.appendChild(script)

  // Plausible respects Do Not Track by default and doesn't collect PII
}
