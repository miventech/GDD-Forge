import * as Lucide from "lucide-react";

// Curated subset of Lucide icons for user-selectable slots.
const ALLOWED = new Set([
  "User", "Users", "UserPlus", "Crown", "Shield", "Sword", "Wand2", "Sparkles",
  "Star", "Heart", "Zap", "Flame", "Snowflake", "Sun", "Moon", "Cloud",
  "Mountain", "TreePine", "Leaf", "Flower2", "Skull", "Ghost", "Bot", "Cat",
  "Dog", "Fish", "Bird", "Bug", "Swords", "Bomb", "Target", "Crosshair",
  "Trophy", "Medal", "Gem", "Diamond", "Coins", "Wallet", "Key", "Lock",
  "Unlock", "Box", "Package", "Map", "MapPin", "Compass", "Navigation",
  "BookOpen", "BookText", "Scroll", "FileText", "Notebook", "Lightbulb",
  "Brain", "Eye", "EyeOff", "Search", "Bell", "MessageSquare", "Mic",
  "Music", "Headphones", "Camera", "Image", "Video", "Film", "Tv",
  "Gamepad2", "Joystick", "Dice5", "Puzzle", "Settings", "Sliders",
  "BoxSelect", "Layers", "LayoutGrid", "Grid3x3", "Layout", "Palette",
  "Brush", "Pen", "Pencil", "Type", "AlignLeft", "Quote", "StickyNote",
  "ArrowRight", "ChevronRight", "CircleDot", "Circle", "Dot", "Minus",
  "Plus", "X", "Check", "CheckCircle2", "AlertCircle", "Info", "HelpCircle",
  "Rocket", "Plane", "Car", "Ship", "Anchor", "Castle", "TowerControl",
  "Inbox", "FolderKanban", "BookOpen", "Folder", "FileText", "Briefcase",
  "Hammer", "Wrench", "Code", "Terminal", "Server", "Database", "Cloud",
  "ListChecks", "ListTodo", "CheckSquare", "ClipboardList", "Kanban",
  "Gamepad2", "Joystick", "Dice5", "Puzzle", "Dices",
]);

export function DynamicIcon({
  name,
  className,
  size = 16,
}: {
  name: string;
  className?: string;
  size?: number;
}) {
  const safe = ALLOWED.has(name) ? name : "Box";
  const Cmp = (Lucide as unknown as Record<string, Lucide.LucideIcon>)[safe] ?? Lucide.Box;
  return <Cmp className={className} size={size} aria-hidden="true" />;
}

export const ICON_OPTIONS = Array.from(ALLOWED).sort();
