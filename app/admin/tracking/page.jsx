
'use client';
import LivePanel from '../../../components/LivePanel';

export default function TrackingPage() {
  return (
    <LivePanel
      title="Tracking & Measurement"
      subtitle="GA4 stream, Google Tag Manager container, Meta pixel, Google Ads conversion and the ads switch — stored server-side and verified by read-back."
      endpoint="/api/admin/tracking"
      fields={[
        { name: 'ga4Id', label: 'GA4 measurement id', placeholder: 'G-XXXXXXXXXX' },
        { name: 'gtmId', label: 'GTM container id', placeholder: 'GTM-XXXXXXX' },
        { name: 'metaPixelId', label: 'Meta pixel id' },
        { name: 'googleAdsId', label: 'Google Ads conversion id' },
        { name: 'adsEnabled', label: 'Ads enabled', placeholder: 'true / false' },
        { name: 'capiEnabled', label: 'Meta CAPI enabled', placeholder: 'true / false' },
      ]}
      actions={[{ action: 'save', label: 'Save and verify', variant: 'btn-primary' }]}
    />
  );
}
