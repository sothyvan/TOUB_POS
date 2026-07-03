import ImageKit from '@imagekit/nodejs';

function isBlank(value) {
  return value === undefined || value === null || String(value).trim() === '';
}

function getRequiredImageKitEnv() {
  const publicKey = process.env.IMAGEKIT_PUBLIC_KEY;
  const privateKey = process.env.IMAGEKIT_PRIVATE_KEY;
  const urlEndpoint = process.env.IMAGEKIT_URL_ENDPOINT;

  if ([publicKey, privateKey, urlEndpoint].some(isBlank)) {
    const error = new Error('ImageKit is not configured. Set IMAGEKIT_PUBLIC_KEY, IMAGEKIT_PRIVATE_KEY, and IMAGEKIT_URL_ENDPOINT.');
    error.status = 500;
    throw error;
  }

  return {
    publicKey: String(publicKey).trim(),
    privateKey: String(privateKey).trim(),
    urlEndpoint: String(urlEndpoint).trim(),
  };
}

export function getUploadAuthenticationParameters() {
  const { publicKey, privateKey, urlEndpoint } = getRequiredImageKitEnv();
  const imagekit = new ImageKit({ privateKey });
  const authentication = imagekit.helper.getAuthenticationParameters();

  return {
    ...authentication,
    publicKey,
    urlEndpoint,
  };
}
