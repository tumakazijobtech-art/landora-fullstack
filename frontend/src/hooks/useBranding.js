import { useEffect, useState } from 'react';
import { getBranding, subscribeToBranding } from '../branding.js';

export default function useBranding() {
  const [branding, setBrandingState] = useState(getBranding);

  useEffect(() => subscribeToBranding(setBrandingState), []);

  return branding;
}
