import { createElement, forwardRef } from 'react'
import {
  Activity as LActivity,
  AlertTriangle as LAlertTriangle,
  AppWindow as LAppWindow,
  ArrowLeft as LArrowLeft,
  ArrowRight as LArrowRight,
  Axe as LAxe,
  BadgeCheck as LBadgeCheck,
  Bell as LBell,
  Bolt as LBolt,
  BookOpen as LBookOpen,
  BrickWall as LBrickWall,
  Briefcase as LBriefcase,
  Calculator as LCalculator,
  Camera as LCamera,
  Car as LCar,
  ChartColumn as LChartColumn,
  Check as LCheck,
  CheckCheck as LCheckCheck,
  ChevronDown as LChevronDown,
  ChevronRight as LChevronRight,
  CircleQuestionMark as LCircleQuestionMark,
  ClipboardList as LClipboardList,
  CreditCard as LCreditCard,
  Crown as LCrown,
  DoorOpen as LDoorOpen,
  Droplets as LDroplets,
  FileText as LFileText,
  Flame as LFlame,
  Globe as LGlobe,
  Grid2x2 as LGrid2x2,
  Hammer as LHammer,
  HardHat as LHardHat,
  Heart as LHeart,
  House as LHouse,
  Image as LImage,
  KeyRound as LKeyRound,
  Layers as LLayers,
  LayoutGrid as LLayoutGrid,
  Lightbulb as LLightbulb,
  Banknote as LBanknote,
  ChevronLeft as LChevronLeft,
  ChevronUp as LChevronUp,
  CircleAlert as LCircleAlert,
  CircleCheck as LCircleCheck,
  CirclePlus as LCirclePlus,
  Clock as LClock,
  CornerDownRight as LCornerDownRight,
  EllipsisVertical as LEllipsisVertical,
  ExternalLink as LExternalLink,
  LogIn as LLogIn,
  MessageSquare as LMessageSquare,
  Minus as LMinus,
  Navigation as LNavigation,
  Phone as LPhone,
  Play as LPlay,
  RefreshCw as LRefreshCw,
  Send as LSend,
  Share2 as LShare2,
  Target as LTarget,
  Upload as LUpload,
  UserPlus as LUserPlus,
  Video as LVideo,
  Lock as LLock,
  LogOut as LLogOut,
  Mail as LMail,
  Map as LMap,
  MapPin as LMapPin,
  Megaphone as LMegaphone,
  Menu as LMenu,
  MessageCircle as LMessageCircle,
  Monitor as LMonitor,
  Newspaper as LNewspaper,
  Package as LPackage,
  PaintBucket as LPaintBucket,
  PaintRoller as LPaintRoller,
  Paintbrush as LPaintbrush,
  Pencil as LPencil,
  Plus as LPlus,
  Radio as LRadio,
  Ruler as LRuler,
  Scissors as LScissors,
  Search as LSearch,
  Settings as LSettings,
  ShieldCheck as LShieldCheck,
  ShoppingBag as LShoppingBag,
  Shovel as LShovel,
  SlidersHorizontal as LSlidersHorizontal,
  Smartphone as LSmartphone,
  Snowflake as LSnowflake,
  Sofa as LSofa,
  Sparkles as LSparkles,
  Sprout as LSprout,
  Square as LSquare,
  Star as LStar,
  Store as LStore,
  Tag as LTag,
  Trash2 as LTrash2,
  TreePine as LTreePine,
  Truck as LTruck,
  Tv as LTv,
  User as LUser,
  Users as LUsers,
  Wrench as LWrench,
  X as LX,
  Zap as LZap,
  type LucideIcon,
  type LucideProps,
} from 'lucide-react'

export type { LucideIcon, LucideProps }

export const ICON_DEFAULT_SIZE = 20
export const ICON_DEFAULT_STROKE = 1.75

function withDefaults(Icon: LucideIcon, displayName: string): LucideIcon {
  const Wrapped = forwardRef<SVGSVGElement, LucideProps>(function VayIcon(
    { size = ICON_DEFAULT_SIZE, strokeWidth = ICON_DEFAULT_STROKE, ...rest },
    ref
  ) {
    return createElement(Icon, { ref, size, strokeWidth, ...rest })
  })
  Wrapped.displayName = displayName
  return Wrapped as LucideIcon
}

// Категории
export const LayoutGrid = withDefaults(LLayoutGrid, 'LayoutGrid')
export const Hammer = withDefaults(LHammer, 'Hammer')
export const Paintbrush = withDefaults(LPaintbrush, 'Paintbrush')
export const PaintRoller = withDefaults(LPaintRoller, 'PaintRoller')
export const PaintBucket = withDefaults(LPaintBucket, 'PaintBucket')
export const Droplets = withDefaults(LDroplets, 'Droplets')
export const Zap = withDefaults(LZap, 'Zap')
export const Car = withDefaults(LCar, 'Car')
export const Truck = withDefaults(LTruck, 'Truck')
export const BrickWall = withDefaults(LBrickWall, 'BrickWall')
export const AppWindow = withDefaults(LAppWindow, 'AppWindow')
export const DoorOpen = withDefaults(LDoorOpen, 'DoorOpen')
export const TreePine = withDefaults(LTreePine, 'TreePine')
export const Sprout = withDefaults(LSprout, 'Sprout')
export const Sofa = withDefaults(LSofa, 'Sofa')
export const Sparkles = withDefaults(LSparkles, 'Sparkles')
export const Snowflake = withDefaults(LSnowflake, 'Snowflake')
export const Flame = withDefaults(LFlame, 'Flame')
export const Axe = withDefaults(LAxe, 'Axe')
export const Shovel = withDefaults(LShovel, 'Shovel')
export const Tv = withDefaults(LTv, 'Tv')
export const Monitor = withDefaults(LMonitor, 'Monitor')
export const FileText = withDefaults(LFileText, 'FileText')
export const Camera = withDefaults(LCamera, 'Camera')
export const Scissors = withDefaults(LScissors, 'Scissors')
export const BookOpen = withDefaults(LBookOpen, 'BookOpen')
export const Layers = withDefaults(LLayers, 'Layers')
export const Square = withDefaults(LSquare, 'Square')
export const Grid2x2 = withDefaults(LGrid2x2, 'Grid2x2')
export const Bolt = withDefaults(LBolt, 'Bolt')

// Навигация
export const Home = withDefaults(LHouse, 'Home')
export const Newspaper = withDefaults(LNewspaper, 'Newspaper')
export const HardHat = withDefaults(LHardHat, 'HardHat')
export const Wrench = withDefaults(LWrench, 'Wrench')
export const ShoppingBag = withDefaults(LShoppingBag, 'ShoppingBag')
export const Store = withDefaults(LStore, 'Store')
export const ClipboardList = withDefaults(LClipboardList, 'ClipboardList')
export const MessageCircle = withDefaults(LMessageCircle, 'MessageCircle')
export const User = withDefaults(LUser, 'User')
export const Users = withDefaults(LUsers, 'Users')
export const Menu = withDefaults(LMenu, 'Menu')

// Поиск и инструменты
export const Search = withDefaults(LSearch, 'Search')
export const SlidersHorizontal = withDefaults(LSlidersHorizontal, 'SlidersHorizontal')
export const Calculator = withDefaults(LCalculator, 'Calculator')
export const Ruler = withDefaults(LRuler, 'Ruler')
export const Map = withDefaults(LMap, 'Map')
export const MapPin = withDefaults(LMapPin, 'MapPin')

// Статусы и действия
export const Star = withDefaults(LStar, 'Star')
export const Bell = withDefaults(LBell, 'Bell')
export const Settings = withDefaults(LSettings, 'Settings')
export const Crown = withDefaults(LCrown, 'Crown')
export const BadgeCheck = withDefaults(LBadgeCheck, 'BadgeCheck')
export const ShieldCheck = withDefaults(LShieldCheck, 'ShieldCheck')
export const Lock = withDefaults(LLock, 'Lock')
export const KeyRound = withDefaults(LKeyRound, 'KeyRound')
export const ChartColumn = withDefaults(LChartColumn, 'ChartColumn')
export const Plus = withDefaults(LPlus, 'Plus')
export const ChevronRight = withDefaults(LChevronRight, 'ChevronRight')
export const ChevronDown = withDefaults(LChevronDown, 'ChevronDown')
export const ArrowRight = withDefaults(LArrowRight, 'ArrowRight')
export const ArrowLeft = withDefaults(LArrowLeft, 'ArrowLeft')
export const X = withDefaults(LX, 'X')
export const Check = withDefaults(LCheck, 'Check')
export const CheckCheck = withDefaults(LCheckCheck, 'CheckCheck')
export const Heart = withDefaults(LHeart, 'Heart')
export const Package = withDefaults(LPackage, 'Package')
export const Tag = withDefaults(LTag, 'Tag')
export const Image = withDefaults(LImage, 'Image')
export const Pencil = withDefaults(LPencil, 'Pencil')
export const Trash2 = withDefaults(LTrash2, 'Trash2')
export const Mail = withDefaults(LMail, 'Mail')
export const Globe = withDefaults(LGlobe, 'Globe')
export const CreditCard = withDefaults(LCreditCard, 'CreditCard')
export const LogOut = withDefaults(LLogOut, 'LogOut')
export const Megaphone = withDefaults(LMegaphone, 'Megaphone')
export const Radio = withDefaults(LRadio, 'Radio')
export const Smartphone = withDefaults(LSmartphone, 'Smartphone')
export const Activity = withDefaults(LActivity, 'Activity')
export const Briefcase = withDefaults(LBriefcase, 'Briefcase')
export const HelpCircle = withDefaults(LCircleQuestionMark, 'HelpCircle')
export const AlertTriangle = withDefaults(LAlertTriangle, 'AlertTriangle')
export const Lightbulb = withDefaults(LLightbulb, 'Lightbulb')
export const AlertCircle = withDefaults(LCircleAlert, 'AlertCircle')
export const CheckCircle = withDefaults(LCircleCheck, 'CheckCircle')
export const PlusCircle = withDefaults(LCirclePlus, 'PlusCircle')
export const ChevronLeft = withDefaults(LChevronLeft, 'ChevronLeft')
export const ChevronUp = withDefaults(LChevronUp, 'ChevronUp')
export const Clock = withDefaults(LClock, 'Clock')
export const CornerDownRight = withDefaults(LCornerDownRight, 'CornerDownRight')
export const MoreVertical = withDefaults(LEllipsisVertical, 'MoreVertical')
export const ExternalLink = withDefaults(LExternalLink, 'ExternalLink')
export const LogIn = withDefaults(LLogIn, 'LogIn')
export const MessageSquare = withDefaults(LMessageSquare, 'MessageSquare')
export const Minus = withDefaults(LMinus, 'Minus')
export const Navigation = withDefaults(LNavigation, 'Navigation')
export const Phone = withDefaults(LPhone, 'Phone')
export const Play = withDefaults(LPlay, 'Play')
export const RefreshCw = withDefaults(LRefreshCw, 'RefreshCw')
export const Send = withDefaults(LSend, 'Send')
export const Share2 = withDefaults(LShare2, 'Share2')
export const Target = withDefaults(LTarget, 'Target')
export const Upload = withDefaults(LUpload, 'Upload')
export const UserPlus = withDefaults(LUserPlus, 'UserPlus')
export const Video = withDefaults(LVideo, 'Video')
export const Banknote = withDefaults(LBanknote, 'Banknote')

export { getMasterCategoryIcon, getProductCategoryIcon } from './categoryIcons'
