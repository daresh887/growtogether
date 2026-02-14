/**
 * Compresses an image file using the browser's Canvas API.
 * 
 * @param file - The original File object to compress.
 * @param options - Configuration options for compression.
 * @param options.maxWidth - Maximum width of the output image (default: 800px).
 * @param options.quality - Quality of the output JPEG image (0 to 1, default: 0.8).
 * @returns A Promise that resolves to the compressed File object.
 */
export async function compressImage(
    file: File,
    options: { maxWidth?: number; quality?: number } = {}
): Promise<File> {
    const { maxWidth = 800, quality = 0.8 } = options;

    return new Promise((resolve, reject) => {
        // Create an image object
        const img = new Image();
        img.src = URL.createObjectURL(file);

        img.onload = () => {
            // accessible via closure
            const canvas = document.createElement('canvas');
            let width = img.width;
            let height = img.height;

            // Calculate new dimensions
            if (width > maxWidth) {
                height = (height * maxWidth) / width;
                width = maxWidth;
            }

            canvas.width = width;
            canvas.height = height;

            const ctx = canvas.getContext('2d');
            if (!ctx) {
                URL.revokeObjectURL(img.src);
                reject(new Error('Failed to get canvas context'));
                return;
            }

            // Draw image on canvas
            ctx.drawImage(img, 0, 0, width, height);

            // Export to blob
            canvas.toBlob(
                (blob) => {
                    URL.revokeObjectURL(img.src); // Cleanup

                    if (!blob) {
                        reject(new Error('Canvas is empty'));
                        return;
                    }

                    // Create a new File object
                    const compressedFile = new File([blob], file.name, {
                        type: 'image/jpeg',
                        lastModified: Date.now(),
                    });

                    resolve(compressedFile);
                },
                'image/jpeg',
                quality
            );
        };

        img.onerror = (error) => {
            URL.revokeObjectURL(img.src);
            reject(error);
        };
    });
}
