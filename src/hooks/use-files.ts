import { useFilesContext } from "@/components/files-context";

// Re-export the FileItem type from the context
export type { FileItem } from "@/components/files-context";

export function useFiles() {
    return useFilesContext();
}
