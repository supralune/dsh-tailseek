export interface Advertisement {
  protocol: number;
  id: string;
  boot: string;
  nodeId: string;
  label: string;
  version: string;
  surface: 'web' | 'desktop';
}
export interface Instance extends Advertisement {
  compatible: boolean;
  key: string;
  machine: string;
  online: boolean;
  latencyMs?: number;
}
export interface DiscoveredInstance extends Instance { origin: string; seen: number }
export interface ScanStamp { boot: string; sequence: number }
export interface Status {
  local?: { id: string; version: string; surface: 'web' | 'desktop' };
  error?: string;
  instances: Instance[];
  lastScan?: ScanStamp;
}
export interface ViewEntry { origin: string; ticket: string; viewId: string; boot: string }
export interface Candidate { nodeId: string; ip: string; label: string }

export const REMOTE_DIRECTORY = '/__tailseek/workspace-directory';
export const DIRECTORY_CAPABILITY = 'x-tailseek-directory-browser';
export interface DirectoryEntry { name: string; path: string; hidden: boolean }
export interface DirectoryListing {
  path: string;
  home: string;
  crumbs: DirectoryEntry[];
  entries: DirectoryEntry[];
  truncated: boolean;
}
export type DirectoryRequest = { action: 'list'; path?: string } | { action: 'create'; path: string; name: string };

export const REMOTE_ATTACHMENT = '/__tailseek/workspace-attachment';
export const ATTACHMENT_CAPABILITY = 'x-tailseek-workspace-attachment';
export const ATTACHMENT_VERSION = '2';
export type RemoteFileLocation = { path: string } | { place: 'workspace' | 'home' };
export type RemoteFileRequest = { sessionId: string } & (
  ({ action: 'list' } & RemoteFileLocation) | { action: 'stage'; path: string }
);
export interface RemoteFileEntry { name: string; path: string; type: 'file' | 'directory'; size?: number }
export interface RemoteFileListing {
  path: string;
  root: string;
  parent?: string;
  entries: RemoteFileEntry[];
  truncated: boolean;
  picked?: string;
}
export interface FileAttachment { attachmentId: string; name: string; bytes: number }
export interface ImageAttachment { attachmentId: string; mediaType: string; bytes: number; width: number; height: number }
export type AttachmentReceipt = { receiptId: string } & ({ file: FileAttachment } | { image: ImageAttachment });
export interface StagedRemoteFile {
  value: AttachmentReceipt;
  name: string;
  bytes: number;
  preview?: string;
}
