import { Card, CardContent } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import Image from "next/image"

interface Video {
  id: string
  title: string
  thumbnailUrl: string
  description: string
}

interface VideoCardProps {
  video: Video
  isSelected: boolean
  onSelect: () => void
}

const VideoCard = ({ video, isSelected, onSelect }: VideoCardProps) => {
  return (
    <Card className={`overflow-hidden transition-all ${isSelected ? "ring-2 ring-primary" : ""}`}>
      <div className="relative">
        <Image
          src={video.thumbnailUrl || "/placeholder.svg"}
          alt={video.title}
          width={300}
          height={200}
          className="w-full h-40 object-cover"
        />
        <div className="absolute top-2 right-2">
          <Checkbox checked={isSelected} onCheckedChange={onSelect} />
        </div>
      </div>
      <CardContent className="p-4">
        <h3 className="font-medium mb-1 truncate">{video.title}</h3>
        <p className="text-sm text-gray-500 dark:text-gray-400 line-clamp-2">{video.description}</p>
      </CardContent>
    </Card>
  )
}

export default VideoCard

