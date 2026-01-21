import { ImgHTMLAttributes } from 'react'

interface ImageProps extends ImgHTMLAttributes<HTMLImageElement> {
  width?: number
  height?: number
  unoptimized?: boolean
}

export default function Image({ width, height, unoptimized, ...props }: ImageProps) {
  return <img {...props} />
}
