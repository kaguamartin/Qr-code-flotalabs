// Domain configuration
export const SHORT_LINK_DOMAIN = 'www.flotalabs.co.ke';
export const SHORT_LINK_BASE_URL = `https://${SHORT_LINK_DOMAIN}`;

// If you want custom domains per org in the future, you can fetch from org settings
export function getShortLinkBase(orgCustomDomain) {
  return orgCustomDomain ? `https://${orgCustomDomain}` : SHORT_LINK_BASE_URL;
}
