"use client"

import * as React from "react"
import {
  Video,
  Film,
  Code2,
  BookOpen,
  Globe,
  Cpu,
  Settings,
  Palette,
  Sparkles,
  Layers,
  Cloud,
  Shield,
  Terminal,
  Database,
  Award,
  Heart,
  GraduationCap,
  Tv,
  Wifi,
  Music,
  Image,
  FileVideo,
  MonitorPlay,
  Podcast,
  Radio,
  Headphones,
  Mic,
  Camera,
  VideoIcon,
  Cast,
  Airplay,
  Youtube,
  Twitch,
  PlayCircle,
  Home,
  Languages,
  Server,
  Activity,
  Package2,
  Accessibility,
  Zap,
  FileCode,
} from "lucide-react"

import { NavMain } from "@/components/nav-main"
import { NavProjects } from "@/components/nav-projects"
import { NavUser } from "@/components/nav-user"
import { TeamSwitcher } from "@/components/team-switcher"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarRail,
} from "@/components/ui/sidebar"
import { AwesomeList, Category } from '@/types/awesome-list'

const getCategoryIcon = (categorySlug: string): React.ComponentType<any> => {
  const categoryIcons: Record<string, React.ComponentType<any>> = {
    'introduction': BookOpen,
    'talks': Mic,
    'courses': GraduationCap,
    'books': BookOpen,
    'blogs': Globe,
    'encoding': Code2,
    'audio-encoding': Headphones,
    'subtitles-captions': Languages,
    'conferences': Award,
    'players': PlayCircle,
    'android': Tv,
    'ios-tvos': Tv,
    'web': Globe,
    'hlsdash': Wifi,
    'ffmpeg': Terminal,
    'transport': Cloud,
    'webrtc': Cast,
    'drm': Shield,
    'tools': Settings,
    'testing': Terminal,
    'streaming-systems': Server,
    'learning': GraduationCap,
    'contributing': Heart,
    'codecs': Cpu,
    'av1': Film,
    'vp9': Film,
    'h264': Film,
    'h265': Film,
    'cloud-cdns': Cloud,
    'vod': FileVideo,
    'live': Radio,
    'analytics': Database,
    'metrics-qos': Activity,
    'machine-learning': Sparkles,
    'containers': Package2,
    'accessibility': Accessibility,
    'streaming-protocols': Wifi,
    'transport-protocols': Globe,
    'latency': Zap,
    'infrastructure': Server,
    'specifications': FileCode,
    'debugging': Terminal,
    'monitoring': Activity,
    'metadata': Database,
    'quality-control': Shield,
    'compression': Layers,
    'packaging': Package2,
    'adaptive-streaming': Wifi,
    'broadcast': Radio,
    'transcoding': Code2,
    'workflow': Settings,
    'processing': Cpu,
    'production': Film,
    'default': Video,
  }
  return categoryIcons[categorySlug] || categoryIcons.default
}

interface AppSidebar07Props {
  awesomeList?: AwesomeList
  isLoading?: boolean
}

export function AppSidebar07({ awesomeList, isLoading }: AppSidebar07Props) {
  const categories = awesomeList?.categories || []
  const resources = awesomeList?.resources || []
  const resourceCount = resources.length

  // Group categories for NavMain
  const navMainItems = React.useMemo(() => {
    const groups = [
      {
        title: "Core Infrastructure",
        categories: ["ffmpeg", "encoding", "audio-encoding", "codecs", "av1", "vp9", "h264", "h265"]
      },
      {
        title: "Streaming & Delivery",
        categories: ["hlsdash", "streaming-systems", "streaming-protocols", "transport", "transport-protocols", "webrtc", "cloud-cdns", "vod", "live", "adaptive-streaming", "broadcast"]
      },
      {
        title: "Players & Clients",
        categories: ["players", "android", "ios-tvos", "web"]
      },
      {
        title: "Learning & Standards",
        categories: ["introduction", "talks", "courses", "books", "blogs", "conferences", "learning", "specifications"]
      }
    ]

    return groups.map(group => {
      const groupCategories = categories.filter((cat: Category) => 
        group.categories.includes(cat.slug)
      )
      
      const Icon = groupCategories.length > 0 ? getCategoryIcon(groupCategories[0].slug) : Video
      
      return {
        title: group.title,
        url: `/category/${groupCategories[0]?.slug || ''}`,
        icon: Icon as any,
        isActive: false,
        items: groupCategories.map((cat: Category) => ({
          title: cat.name,
          url: `/category/${cat.slug}`,
          count: cat.resources.length
        })),
        count: groupCategories.reduce((sum: number, cat: Category) => sum + cat.resources.length, 0)
      }
    }).filter(item => item.items.length > 0)
  }, [categories])

  // Featured projects
  const projects = [
    {
      name: "AI Color Palette",
      url: "/color-palette",
      icon: Palette,
    },
    {
      name: "Advanced Search",
      url: "/advanced",
      icon: Settings,
    },
    {
      name: "About",
      url: "/about",
      icon: BookOpen,
    },
  ]

  // User data
  const user = {
    name: "Guest User",
    email: "guest@awesome.video",
    avatar: "/avatars/guest.png",
  }

  // Teams data
  const teams = [
    {
      name: "Awesome Video",
      logo: Video,
      plan: `${resourceCount} Resources`,
    },
  ]

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <TeamSwitcher teams={teams} />
      </SidebarHeader>
      <SidebarContent>
        <NavMain items={navMainItems} />
        <NavProjects projects={projects} />
      </SidebarContent>
      <SidebarFooter>
        <NavUser user={user} />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}