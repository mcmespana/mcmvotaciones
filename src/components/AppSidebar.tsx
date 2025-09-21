import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";
import { 
  Database, 
  Images, 
  Calendar, 
  Music, 
  Gamepad2, 
  Trophy,
  ChevronRight,
  Zap,
  Bell
} from "lucide-react";
import { cn } from "@/lib/utils";
import { ActiveSection, JSONData } from "./JSONManager";

interface AppSidebarProps {
  activeSection: ActiveSection;
  onSectionChange: (section: ActiveSection) => void;
  jsonData: JSONData;
}

const menuItems = [
  {
    id: 'app' as ActiveSection,
    title: 'App',
    icon: Database,
    description: 'Feedback y configuración'
  },
  {
    id: 'albums' as ActiveSection,
    title: 'Albums',
    icon: Images,
    description: 'Gestión de álbumes'
  },
  {
    id: 'calendars' as ActiveSection,
    title: 'Calendars',
    icon: Calendar,
    description: 'Configuración de calendarios'
  },
  {
    id: 'songs' as ActiveSection,
    title: 'Cantoral',
    icon: Music,
    description: 'Canciones y repertorio'
  },
  {
    id: 'wordle' as ActiveSection,
    title: 'Wordle',
    icon: Gamepad2,
    description: 'Palabras diarias'
  },
  {
    id: 'jubileo' as ActiveSection,
    title: 'Jubileo',
    icon: Trophy,
    description: 'Contenidos del Jubileo 2025'
  },
  {
    id: 'activities' as ActiveSection,
    title: 'Actividades',
    icon: Zap,
    description: 'Gestión de actividades'
  },
  {
    id: 'notifications' as ActiveSection,
    title: 'Notificaciones',
    icon: Bell,
    description: 'Push notifications'
  },
];

export function AppSidebar({ activeSection, onSectionChange, jsonData }: AppSidebarProps) {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";

  const getSectionStatus = (sectionId: ActiveSection) => {
    const sectionData = jsonData[sectionId];
    if (!sectionData) return 'empty';
    
    if (sectionId === 'app') {
      const feedbackCount = Object.keys(sectionData.feedback || {}).reduce((total, category) => {
        return total + Object.keys(sectionData.feedback[category] || {}).length;
      }, 0);
      return feedbackCount > 0 ? 'active' : 'empty';
    }
    
    if (sectionId === 'songs' && sectionData.data) {
      const categoriesCount = Object.keys(sectionData.data).length;
      return categoriesCount > 0 ? 'active' : 'empty';
    }
    
    if (sectionData.data) {
      return Array.isArray(sectionData.data) ? 
        sectionData.data.length > 0 ? 'active' : 'empty' :
        Object.keys(sectionData.data).length > 0 ? 'active' : 'empty';
    }
    
    return Object.keys(sectionData).length > 0 ? 'active' : 'empty';
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-accent/20 border-accent/30';
      case 'empty': return 'bg-muted/20 border-muted/30';
      default: return 'bg-muted/20 border-muted/30';
    }
  };

  return (
    <Sidebar className={cn("border-r border-border/50 bg-card/40 backdrop-blur-md", collapsed ? "w-16" : "w-64")}>
      <SidebarContent className="p-3">
        <SidebarGroup>
          <SidebarGroupLabel className="mb-2 text-primary font-bold flex items-center tracking-wide">
            <Zap className="w-4 h-4 mr-2" />
            {!collapsed && "Secciones"}
          </SidebarGroupLabel>
          
          <SidebarGroupContent>
            <SidebarMenu className="space-y-2">
              {menuItems.map((item) => {
                const isActive = activeSection === item.id;
                const status = getSectionStatus(item.id);
                const showIndicator = item.id !== 'notifications';
                
                return (
                  <SidebarMenuItem key={item.id}>
                    <SidebarMenuButton
                      onClick={() => onSectionChange(item.id)}
                      className={cn(
                        "relative group transition-all duration-200 rounded-lg border px-3 py-2 min-h-12",
                        isActive 
                          ? "bg-primary/10 border-primary/30 text-primary shadow-glow" 
                          : getStatusColor(status),
                        "hover:bg-primary/5 hover:border-primary/20"
                      )}
                    >
                      <div className="flex items-center w-full gap-3">
                        <item.icon className={cn(
                          "w-5 h-5 transition-colors",
                          isActive ? "text-primary" : "text-foreground/70"
                        )} />
                        
                        {!collapsed && (
                          <div className="ml-3 flex-1 min-w-0">
                            <div className="flex items-center justify-between">
                              <span className="font-medium truncate leading-tight">{item.title}</span>
                              <ChevronRight className={cn(
                                "w-4 h-4 transition-all duration-200",
                                isActive ? "rotate-90 text-primary" : "text-muted-foreground group-hover:translate-x-1"
                              )} />
                            </div>
                            <p className="text-xs text-muted-foreground mt-1 truncate">
                              {item.description}
                            </p>
                          </div>
                        )}
                      </div>
                      
                      {isActive && (
                        <div className="absolute inset-0 bg-gradient-primary opacity-5 rounded-lg" />
                      )}
                      {!collapsed && showIndicator && (
                        <>
                          <div className={cn(
                            "absolute right-2 top-1 w-2 h-2 rounded-full",
                            status === 'active' ? 'bg-success' : 'bg-muted-foreground/40'
                          )} />
                          <div className={cn(
                            "absolute right-2 bottom-1 w-2 h-2 rounded-full",
                            status === 'active' ? 'bg-success' : 'bg-muted-foreground/40'
                          )} />
                        </>
                      )}
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}
