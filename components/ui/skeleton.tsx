import { LoadingBlock } from "@/components/loading/loading"

import { cn } from "@/lib/utils"

function Skeleton({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <LoadingBlock
      className={cn("rounded-xl", className)}
      {...props}
    />
  )
}

export { Skeleton }
