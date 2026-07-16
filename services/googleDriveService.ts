/**
 * Google Drive Service for TransAI
 * Handles OAuth2 flow and file storage for configuration JSONs.
 */

const DISCOVERY_DOC = 'https://www.googleapis.com/discovery/v1/apis/drive/v3/rest';
const SCOPES = 'https://www.googleapis.com/auth/drive.file';

let tokenClient: any = null;
let gapiInited = false;
let gisInited = false;

export interface DriveSyncFile {
  id: string;
  name: string;
  modifiedTime: string;
}

export const initGoogleApi = (): Promise<void> => {
  return new Promise((resolve) => {
    const checkReady = () => {
      if ((window as any).gapi && (window as any).google) {
        gapiLoaded(resolve);
        gisLoaded();
      } else {
        setTimeout(checkReady, 100);
      }
    };
    checkReady();
  });
};

function gapiLoaded(resolve: () => void) {
  (window as any).gapi.load('client', async () => {
    await (window as any).gapi.client.init({
      discoveryDocs: [DISCOVERY_DOC],
    });
    gapiInited = true;
    resolve();
  });
}

function gisLoaded() {
  tokenClient = (window as any).google.accounts.oauth2.initTokenClient({
    client_id: 'YOUR_GOOGLE_CLIENT_ID.apps.googleusercontent.com',
    scope: SCOPES,
    callback: '',
  });
  gisInited = true;
}

export const authenticateDrive = (): Promise<string> => {
  return new Promise((resolve, reject) => {
    tokenClient.callback = async (resp: any) => {
      if (resp.error !== undefined) {
        reject(resp);
      }
      resolve(resp.access_token);
    };

    // Use empty prompt to avoid request popups when possible
    if ((window as any).gapi.client.getToken() === null) {
      tokenClient.requestAccessToken({ prompt: '' });
    } else {
      tokenClient.requestAccessToken({ prompt: '' });
    }
  });
};

export const listTransFiles = async (nameFilter: string): Promise<DriveSyncFile[]> => {
  try {
    const response = await (window as any).gapi.client.drive.files.list({
      pageSize: 10,
      fields: 'files(id, name, modifiedTime)',
      q: `name contains '${nameFilter}' and trashed = false`,
    });
    return response.result.files || [];
  } catch (err) {
    console.error('Drive listing error', err);
    return [];
  }
};

export const downloadFileData = async (fileId: string): Promise<any> => {
  try {
    const response = await (window as any).gapi.client.drive.files.get({
      fileId: fileId,
      alt: 'media',
    });
    return response.result;
  } catch (err) {
    console.error('Download error', err);
    throw err;
  }
};

export const saveToDrive = async (name: string, data: any, existingFileId?: string): Promise<string> => {
  const boundary = '-------314159265358979323846';
  const delimiter = "\r\n--" + boundary + "\r\n";
  const close_delim = "\r\n--" + boundary + "--";

  const contentType = 'application/json';
  const metadata = {
    name: name,
    mimeType: contentType,
  };

  const multipartRequestBody =
    delimiter +
    'Content-Type: application/json\r\n\r\n' +
    JSON.stringify(metadata) +
    delimiter +
    'Content-Type: ' + contentType + '\r\n\r\n' +
    JSON.stringify(data) +
    close_delim;

  try {
    const path = existingFileId 
      ? `/upload/drive/v3/files/${existingFileId}?uploadType=multipart`
      : '/upload/drive/v3/files?uploadType=multipart';
    
    const method = existingFileId ? 'PATCH' : 'POST';

    const response = await (window as any).gapi.client.request({
      path: path,
      method: method,
      params: { uploadType: 'multipart' },
      headers: {
        'Content-Type': 'multipart/related; boundary="' + boundary + '"',
      },
      body: multipartRequestBody,
    });
    
    return response.result.id;
  } catch (err) {
    console.error('Save error', err);
    throw err;
  }
};