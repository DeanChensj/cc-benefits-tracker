// Google Drive AppData Sandboxed Sync Helper ( Bring Your Own Cloud )

export interface GoogleOAuthTokenClient {
  requestAccessToken: (options: { prompt: string }) => void;
}

export interface GoogleOAuth {
  initTokenClient: (config: {
    client_id: string;
    scope: string;
    callback: (response: { error?: string | Record<string, unknown>; access_token?: string }) => void;
  }) => GoogleOAuthTokenClient;
}

export interface GoogleGSI {
  accounts?: {
    oauth2?: GoogleOAuth;
  };
}

declare global {
  interface Window {
    google?: GoogleGSI;
  }
}

const CLIENT_ID = '200919207225-04kmtc0j6nmshkjjqkk3qkuv05b8el23.apps.googleusercontent.com';
const SCOPES = 'https://www.googleapis.com/auth/drive.appdata email';

// Load Google Identity Services script dynamically on mount
export function loadGoogleGsiScript(): Promise<void> {
  return new Promise((resolve, reject) => {
    if (window.google?.accounts?.oauth2) {
      resolve();
      return;
    }
    const script = document.createElement('script');
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.defer = true;
    script.onload = () => resolve();
    script.onerror = (err) => reject(err);
    document.head.appendChild(script);
  });
}

// Request OAuth access token from user using standard GIS token client popup
export function requestGDriveToken(customClientId?: string | null): Promise<string> {
  return new Promise((resolve, reject) => {
    if (!window.google?.accounts?.oauth2) {
      reject(new Error('Google GSI Client library not loaded.'));
      return;
    }

    const client = window.google.accounts.oauth2.initTokenClient({
      client_id: customClientId || CLIENT_ID,
      scope: SCOPES,
      callback: (response: { error?: string | Record<string, unknown>; access_token?: string }) => {
        if (response.error) {
          reject(response);
        } else {
          resolve(response.access_token || '');
        }
      },
    });
    
    // Omit prompt to let Google GIS decide (silent if already consented!)
    client.requestAccessToken({ prompt: '' });
  });
}

// Fetch user's profile details (specifically email) for the UI link indicator
export async function fetchUserEmail(token: string): Promise<string> {
  const response = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!response.ok) throw new Error('Failed to fetch user profile.');
  const data = await response.json();
  return data.email || 'Google Account';
}

// Search for cc_tracker_sync.json inside user's private, hidden appDataFolder
export async function findSyncFile(token: string): Promise<string | null> {
  const query = encodeURIComponent("name = 'cc_tracker_sync.json' and parents in 'appDataFolder' and trashed = false");
  const response = await fetch(
    `https://www.googleapis.com/drive/v3/files?q=${query}&spaces=appDataFolder&fields=files(id,name)&t=${Date.now()}`,
    {
      headers: { Authorization: `Bearer ${token}` },
    }
  );

  if (!response.ok) throw new Error('Failed to query Google Drive AppData files.');
  const data = await response.json();
  const files = data.files || [];
  return files.length > 0 ? files[0].id : null;
}

// Download JSON file content from Google Drive
export async function downloadSyncFile(token: string, fileId: string): Promise<unknown> {
  const response = await fetch(
    `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media&t=${Date.now()}`,
    {
      headers: { Authorization: `Bearer ${token}` },
    }
  );
  if (!response.ok) throw new Error('Failed to download sync file from Google Drive.');
  return await response.json();
}

// Upload (Create or Patch) JSON file content inside user's private, hidden appDataFolder
export async function uploadSyncFile(token: string, fileId: string | null, data: unknown): Promise<string> {
  const fileMetadata: { name: string; parents?: string[] } = {
    name: 'cc_tracker_sync.json',
  };
  if (!fileId) {
    fileMetadata.parents = ['appDataFolder'];
  }

  const boundary = '-------314159265358979323846';
  const delimiter = `\r\n--${boundary}\r\n`;
  const closeDelimiter = `\r\n--${boundary}--`;

  const multipartRequestBody =
    delimiter +
    'Content-Type: application/json; charset=UTF-8\r\n\r\n' +
    JSON.stringify(fileMetadata) +
    delimiter +
    'Content-Type: application/json\r\n\r\n' +
    JSON.stringify(data) +
    closeDelimiter;

  let url = 'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id';
  let method = 'POST';

  if (fileId) {
    // Update existing file using PATCH
    url = `https://www.googleapis.com/upload/drive/v3/files/${fileId}?uploadType=multipart&fields=id`;
    method = 'PATCH';
  }

  const response = await fetch(url, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': `multipart/related; boundary=${boundary}`,
    },
    body: multipartRequestBody,
  });

  if (!response.ok) throw new Error('Failed to upload sync file to Google Drive.');
  const file = await response.json();
  return file.id;
}
