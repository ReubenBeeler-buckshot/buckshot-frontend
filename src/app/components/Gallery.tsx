import { useState, useEffect } from "react";
import { Search, ArrowUpDown, Download } from "lucide-react";
import { Input } from "./ui/input";
import { Button } from "./ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { Skeleton } from "./ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "./ui/dialog";

interface GalleryImage {
  key: string;
  url: string;
  lastModified: string;
  size: number;
  metadata: any;
}

// CloudFront distribution domains
const CLOUDFRONT_GET_DOMAIN = "d1tyw9tv8qplvm.cloudfront.net";
const CLOUDFRONT_LIST_DOMAIN = "d23n8qhlhvu9hv.cloudfront.net";

export default function Gallery() {
  const [images, setImages] = useState<GalleryImage[]>([]);
  const [filteredImages, setFilteredImages] = useState<GalleryImage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState("date-desc");
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedImage, setSelectedImage] = useState<GalleryImage | null>(null);
  const imagesPerPage = 12;

  useEffect(() => {
    fetchImages();
  }, []);

  useEffect(() => {
    filterAndSortImages();
  }, [images, searchQuery, sortBy]);

  const fetchImages = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // List images using CloudFront
      const listImagesUrl = `https://${CLOUDFRONT_LIST_DOMAIN}/?list-type=2&prefix=validated/images/`;
      const response = await fetch(listImagesUrl);
      
      if (!response.ok) {
        throw new Error(`Failed to list images from CloudFront: ${response.statusText}`);
      }

      const listXml = await response.text();
      
      // Parse XML response to extract image keys
      const keyMatches = listXml.matchAll(/<Key>([^<]+)<\/Key>/g);
      const sizeMatches = listXml.matchAll(/<Size>([^<]+)<\/Size>/g);
      const lastModifiedMatches = listXml.matchAll(/<LastModified>([^<]+)<\/LastModified>/g);
      
      const keys = Array.from(keyMatches).map(match => match[1]);
      const sizes = Array.from(sizeMatches).map(match => parseInt(match[1]));
      const lastModifieds = Array.from(lastModifiedMatches).map(match => match[1]);
      
      if (keys.length === 0) {
        setImages([]);
        return;
      }

      // Filter for image files and generate CloudFront URLs with metadata
      const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp', '.svg'];
      const imageList = await Promise.all(
        keys
          .filter((key) => {
            // Skip if this is a directory marker or not an image
            if (key.endsWith('/')) return false;
            return imageExtensions.some(ext => key.toLowerCase().endsWith(ext));
          })
          .map(async (imageKey) => {
            // Find the corresponding size and lastModified for this key
            const keyIndex = keys.indexOf(imageKey);
            const size = sizes[keyIndex] || 0;
            const lastModified = lastModifieds[keyIndex] || new Date().toISOString();
            
            // Extract filename from the image path (validated/images/image1234.jpg -> image1234.jpg)
            const filename = imageKey.split('/').pop() || '';
            
            // Generate CloudFront URL for the image
            const imageUrl = `https://${CLOUDFRONT_GET_DOMAIN}/validated/images/${filename}`;
            
            // Fetch metadata from CloudFront
            const metadataFilename = `${filename}.json`;
            const metadataUrl = `https://${CLOUDFRONT_GET_DOMAIN}/validated/metadata/${metadataFilename}`;
            
            let metadata = null;
            try {
              const metadataResponse = await fetch(metadataUrl);
              
              if (metadataResponse.ok) {
                metadata = await metadataResponse.json();
              }
            } catch (metadataError) {
              // Metadata file doesn't exist or couldn't be read, continue without it
              console.log(`No metadata found for ${filename}`);
            }
            
            return {
              key: imageKey,
              url: imageUrl,
              lastModified,
              size,
              metadata,
            };
          })
      );

      setImages(imageList);
    } catch (err) {
      console.error("Error fetching images:", err);
      setError(err instanceof Error ? err.message : "Failed to load images");
    } finally {
      setLoading(false);
    }
  };

  // Parse filename to extract date - expecting format like: 2026-01-19_13:48:20.123456.jpg
  const parseDateFromFilename = (filename: string): Date | null => {
    try {
      // Strip the extension (everything after the last period)
      const lastDotIndex = filename.lastIndexOf('.');
      if (lastDotIndex === -1) return null;
      
      const filenameWithoutExt = filename.substring(0, lastDotIndex);
      
      // Try to match YYYY-MM-DD_HH:MM:SS.ffffff pattern
      const match = filenameWithoutExt.match(/(\d{4})-(\d{2})-(\d{2})_(\d{2}):(\d{2}):(\d{2})\.(\d+)/);
      if (match) {
        const [, year, month, day, hour, minute, second] = match;
        return new Date(
          parseInt(year),
          parseInt(month) - 1,
          parseInt(day),
          parseInt(hour),
          parseInt(minute),
          parseInt(second)
        );
      }
      
      // Fallback: try without microseconds
      const matchSimple = filenameWithoutExt.match(/(\d{4})-(\d{2})-(\d{2})_(\d{2}):(\d{2}):(\d{2})/);
      if (matchSimple) {
        const [, year, month, day, hour, minute, second] = matchSimple;
        return new Date(
          parseInt(year),
          parseInt(month) - 1,
          parseInt(day),
          parseInt(hour),
          parseInt(minute),
          parseInt(second)
        );
      }
    } catch (e) {
      console.error("Error parsing date from filename:", e);
    }
    return null;
  };

  // Format date as "January 19, 2026 at 1:48 PM"
  const formatDate = (date: Date): string => {
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
  };

  // Count total animals in metadata
  const countAnimalsInMetadata = (metadata: any): number => {
    if (!Array.isArray(metadata)) return 0;
    return metadata.length;
  };

  const filterAndSortImages = () => {
    let filtered = [...images];

    // Apply search filter - search ONLY in metadata species/scientific names (not filename)
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter((img) => {
        // Search in metadata only
        if (Array.isArray(img.metadata)) {
          return img.metadata.some((detection: any) => {
            const commonName = (detection.common_name || "").toLowerCase();
            const scientificName = (detection.scientific_name || "").toLowerCase();
            return commonName.includes(query) || scientificName.includes(query);
          });
        }
        return false;
      });
    }

    // Apply sorting
    filtered.sort((a, b) => {
      switch (sortBy) {
        case "date-desc": {
          const dateA = parseDateFromFilename(a.key) || new Date(a.lastModified);
          const dateB = parseDateFromFilename(b.key) || new Date(b.lastModified);
          return dateB.getTime() - dateA.getTime();
        }
        case "date-asc": {
          const dateA = parseDateFromFilename(a.key) || new Date(a.lastModified);
          const dateB = parseDateFromFilename(b.key) || new Date(b.lastModified);
          return dateA.getTime() - dateB.getTime();
        }
        case "animals-desc": {
          return countAnimalsInMetadata(b.metadata) - countAnimalsInMetadata(a.metadata);
        }
        case "animals-asc": {
          return countAnimalsInMetadata(a.metadata) - countAnimalsInMetadata(b.metadata);
        }
        default:
          return 0;
      }
    });

    setFilteredImages(filtered);
    setCurrentPage(1); // Reset to first page when filters change
  };

  // Pagination
  const indexOfLastImage = currentPage * imagesPerPage;
  const indexOfFirstImage = indexOfLastImage - imagesPerPage;
  const currentImages = filteredImages.slice(indexOfFirstImage, indexOfLastImage);
  const totalPages = Math.ceil(filteredImages.length / imagesPerPage);

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  // Parse metadata to group by species and calculate average scores
  const parseWildlifeMetadata = (metadata: any) => {
    if (!Array.isArray(metadata)) return null;

    // Group detections by common name
    const grouped = metadata.reduce((acc: any, detection: any) => {
      const commonName = detection.common_name;
      const scientificName = detection.scientific_name;
      const score = detection.score || 0;

      if (!acc[commonName]) {
        acc[commonName] = {
          commonName,
          scientificName,
          count: 0,
          totalScore: 0,
        };
      }

      acc[commonName].count += 1;
      acc[commonName].totalScore += score;

      return acc;
    }, {});

    // Convert to array and calculate average scores
    const species = Object.values(grouped).map((group: any) => ({
      commonName: group.commonName,
      scientificName: group.scientificName,
      count: group.count,
      avgScore: group.totalScore / group.count,
    }));

    // Sort by average score descending
    species.sort((a: any, b: any) => b.avgScore - a.avgScore);

    return species;
  };

  const handleDownload = (url: string, filename: string) => {
    // Create a temporary anchor element and trigger download
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    link.target = "_blank";
    link.rel = "noopener noreferrer";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header with Search and Filters */}
      <div className="mb-8 space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold">Gallery</h1>
          <span className="text-m text-muted-foreground">Updated daily at 10pm</span>
        </div>
        
        <div className="flex flex-col sm:flex-row gap-4">
          {/* Search Box */}
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Search by species..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>

          {/* Sort Filter */}
          <div className="flex items-center gap-2">
            <ArrowUpDown className="h-4 w-4 text-muted-foreground" />
            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Sort by" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="date-desc">Newest First</SelectItem>
                <SelectItem value="date-asc">Oldest First</SelectItem>
                <SelectItem value="animals-desc">Most Animals</SelectItem>
                <SelectItem value="animals-asc">Fewest Animals</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Results count */}
        <div className="text-sm text-muted-foreground">
          {filteredImages.length} {filteredImages.length === 1 ? "image" : "images"} found
        </div>
      </div>

      {/* Error State */}
      {error && (
        <div className="rounded-lg border border-destructive bg-destructive/10 p-4 mb-8">
          <p className="text-sm text-destructive">{error}</p>
          <Button onClick={fetchImages} variant="outline" size="sm" className="mt-2">
            Retry
          </Button>
        </div>
      )}

      {/* Loading State */}
      {loading && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="aspect-square rounded-lg" />
          ))}
        </div>
      )}

      {/* Image Grid */}
      {!loading && !error && currentImages.length > 0 && (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {currentImages.map((image) => (
              <div
                key={image.key}
                onClick={() => setSelectedImage(image)}
                className="group relative aspect-square overflow-hidden rounded-lg border bg-muted hover:border-primary transition-colors cursor-pointer"
              >
                <img
                  src={image.url}
                  alt={image.key}
                  className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-200"
                  loading="lazy"
                />
                <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-end p-3">
                  <p className="text-white text-xs font-medium truncate">
                    {image.key.split("/").pop()}
                  </p>
                  {image.metadata && (
                    <p className="text-white/70 text-xs mt-1">Click to view metadata</p>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="mt-8 flex items-center justify-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => handlePageChange(currentPage - 1)}
                disabled={currentPage === 1}
              >
                Previous
              </Button>
              
              <div className="flex gap-1">
                {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => {
                  // Show first, last, current, and adjacent pages
                  if (
                    page === 1 ||
                    page === totalPages ||
                    (page >= currentPage - 1 && page <= currentPage + 1)
                  ) {
                    return (
                      <Button
                        key={page}
                        variant={currentPage === page ? "default" : "outline"}
                        size="sm"
                        onClick={() => handlePageChange(page)}
                        className="w-10"
                      >
                        {page}
                      </Button>
                    );
                  } else if (page === currentPage - 2 || page === currentPage + 2) {
                    return (
                      <span key={page} className="flex items-center px-2">
                        ...
                      </span>
                    );
                  }
                  return null;
                })}
              </div>

              <Button
                variant="outline"
                size="sm"
                onClick={() => handlePageChange(currentPage + 1)}
                disabled={currentPage === totalPages}
              >
                Next
              </Button>
            </div>
          )}
        </>
      )}

      {/* Empty State */}
      {!loading && !error && currentImages.length === 0 && (
        <div className="text-center py-12">
          <p className="text-muted-foreground">
            {searchQuery ? "No images match your search" : "No images found in your S3 bucket"}
          </p>
        </div>
      )}

      {/* Image Detail Dialog */}
      <Dialog open={!!selectedImage} onOpenChange={(open) => !open && setSelectedImage(null)}>
        <DialogContent className="!max-w-[90vw] max-h-[90vh] w-fit p-6 flex flex-col overflow-hidden">
          {selectedImage && (
            <>
              <DialogHeader className="pr-10 shrink-0 pb-1">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <DialogTitle className="text-xl leading-relaxed pb-1">{selectedImage.key.split("/").pop()}</DialogTitle>
                    <DialogDescription className="text-base">
                      Wildlife detection results and image details
                    </DialogDescription>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {}} // {() => handleDownload(selectedImage.url, selectedImage.key.split("/").pop() || "image.jpg")}
                    className="shrink-0"
                  >
                    <Download className="h-4 w-4 mr-2" />
                    Download Temporarily Disabled
                  </Button>
                </div>
              </DialogHeader>
              
              <div className="flex flex-col gap-6 overflow-y-auto flex-1 min-h-0">
                {/* Image Preview - Flexes to fill available space */}
                <div className="rounded-lg overflow-hidden border">
                  <img
                    src={selectedImage.url}
                    alt={selectedImage.key}
                    className="block max-w-[calc(90vw-3rem)] max-h-[calc(90vh-300px)] w-auto h-auto"
                  />
                </div>

                {/* Image Info - Single column below image */}
                <div className="flex-shrink-0">
                  <h3 className="text-base font-semibold mb-3">Image Information</h3>
                  <div className="space-y-2 text-base">
                    <div className="flex justify-between gap-4">
                      <div className="text-muted-foreground">Date:</div>
                      <div className="text-right">
                        {(() => {
                          const filename = selectedImage.key.split("/").pop() || "";
                          const date = parseDateFromFilename(filename);
                          return date ? formatDate(date) : "Unknown";
                        })()}
                      </div>
                    </div>
                    
                    <div className="flex justify-between gap-4">
                      <div className="text-muted-foreground">Size:</div>
                      <div className="text-right">{(selectedImage.size / 1024).toFixed(2)} KB</div>
                    </div>
                  </div>
                </div>

                {/* Wildlife Detections - Single column below info */}
                <div className="flex-shrink-0">
                  {selectedImage.metadata && Array.isArray(selectedImage.metadata) ? (
                    <>
                      <h3 className="text-base font-semibold mb-3">Detected Wildlife</h3>
                      {(() => {
                        const species = parseWildlifeMetadata(selectedImage.metadata);
                        if (!species || species.length === 0) {
                          return <p className="text-base text-muted-foreground">No wildlife detected in this image.</p>;
                        }
                        
                        return (
                          <div className="border rounded-lg overflow-auto max-h-[200px]">
                            <table className="w-full text-base">
                              <thead className="bg-muted sticky top-0">
                                <tr>
                                  <th className="text-left p-3 font-semibold">Number</th>
                                  <th className="text-left p-3 font-semibold">Species</th>
                                  <th className="text-left p-3 font-semibold">Scientific Name</th>
                                </tr>
                              </thead>
                              <tbody>
                                {species.map((item: any, index: number) => (
                                  <tr key={index} className="border-t">
                                    <td className="p-3">{item.count}</td>
                                    <td className="p-3">{item.commonName}</td>
                                    <td className="p-3 italic">{item.scientificName}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        );
                      })()}
                    </>
                  ) : selectedImage.metadata ? (
                    <>
                      <h3 className="text-base font-semibold mb-3">Metadata</h3>
                      <div className="bg-muted rounded-lg p-4 max-h-[200px] overflow-auto">
                        <pre className="text-sm overflow-x-auto whitespace-pre-wrap break-words">
                          {JSON.stringify(selectedImage.metadata, null, 2)}
                        </pre>
                      </div>
                    </>
                  ) : (
                    <>
                      <h3 className="text-base font-semibold mb-3">Metadata</h3>
                      <p className="text-base text-muted-foreground">No metadata available for this image.</p>
                    </>
                  )}
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}