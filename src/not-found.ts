import { recoverLegacyPath } from './paths'

const target = recoverLegacyPath(location.pathname, import.meta.env.BASE_URL)
if (target) location.replace(target)
