import type { LucideIcon } from 'lucide-react'
import { BarChart3, BookOpen, Languages, LogOut, Moon, Package, Settings, ShoppingCart, Sun, Truck } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Navigate, NavLink, Route, Routes } from 'react-router-dom'
import type { Role, Session } from '@shared/types'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Sidebar, SidebarContent, SidebarFooter, SidebarGroup, SidebarGroupContent, SidebarGroupLabel, SidebarHeader, SidebarInset, SidebarMenu, SidebarMenuButton, SidebarMenuItem, SidebarProvider, SidebarRail } from '@/components/ui/sidebar'
import { useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/ipc-client'
import { useAppLanguage } from '@/lib/i18n'
import { useTheme } from '@/lib/theme'
import { PlaceholderPage } from '@/routes/placeholder'
import { CounterPage } from '@/routes/counter'
import { StockPage } from '@/routes/stock'
import { SettingsPage } from '@/routes/settings'

interface NavItem {
  key: string
  path: string
  icon: LucideIcon
  roles: Role[]
}

const NAV_ITEMS: NavItem[] = [
  { key: 'counter', path: '/', icon: ShoppingCart, roles: ['owner', 'employee'] },
  { key: 'stock', path: '/stock', icon: Package, roles: ['owner'] },
  { key: 'delivery', path: '/delivery', icon: Truck, roles: ['owner', 'employee'] },
  { key: 'reports', path: '/reports', icon: BarChart3, roles: ['owner'] },
  { key: 'settings', path: '/settings', icon: Settings, roles: ['owner'] },
  { key: 'guide', path: '/guide', icon: BookOpen, roles: ['owner', 'employee'] },
]

export function AppShell({ session }: { session: Session }) {
  const items = NAV_ITEMS.filter((item) => item.roles.includes(session.role))
  const { language } = useAppLanguage()

  return (
    <SidebarProvider>
      <AppSidebar session={session} items={items} side={language === 'ar' ? 'right' : 'left'} />
      <SidebarInset className="bg-background">
        <main className="h-screen overflow-auto p-6">
          <Routes>
            <Route path="/" element={<CounterPage session={session} />} />
            <Route
              path="/stock"
              element={session.role === 'owner' ? <StockPage /> : <Navigate to="/" replace />}
            />
            <Route path="/delivery" element={<PlaceholderPage icon={Truck} titleKey="nav.delivery" />} />
            <Route
              path="/reports"
              element={
                session.role === 'owner' ? (
                  <PlaceholderPage icon={BarChart3} titleKey="nav.reports" />
                ) : (
                  <Navigate to="/" replace />
                )
              }
            />
            <Route
              path="/settings"
              element={session.role === 'owner' ? <SettingsPage /> : <Navigate to="/" replace />}
            />
            <Route path="/guide" element={<PlaceholderPage icon={BookOpen} titleKey="nav.guide" />} />
          </Routes>
        </main>
      </SidebarInset>
    </SidebarProvider>
  )
}

function AppSidebar({
  session,
  items,
  side,
}: {
  session: Session
  items: NavItem[]
  side: 'left' | 'right'
}) {
  const { t } = useTranslation()
  const { theme, toggleTheme } = useTheme()
  const { language, toggleLanguage } = useAppLanguage()
  const queryClient = useQueryClient()

  const logout = async () => {
    await api.auth.logout()
    void queryClient.invalidateQueries({ queryKey: ['auth-status'] })
  }

  return (
    <Sidebar side={side} collapsible="icon" className="bg-sidebar text-sidebar-foreground">
      <SidebarHeader>
        <div className="flex items-center gap-3 px-2 py-1">
          <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-gold">
            <ShoppingCart className="size-5 text-white" />
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-bold text-white">{t('app.name')}</p>
            <p className="truncate text-xs text-sidebar-foreground/60">{t('app.subtitle')}</p>
          </div>
        </div>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel className="text-sidebar-foreground/50">Menu</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {items.map((item) => (
                <SidebarMenuItem key={item.key}>
                  <SidebarMenuButton asChild>
                    <NavLink to={item.path} end={item.path === '/'}>
                      {({ isActive }) => (
                        <>
                          <item.icon />
                          <span>{t(`nav.${item.key}`)}</span>
                          {isActive && <span className="ms-auto size-1.5 rounded-full bg-gold" />}
                        </>
                      )}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter>
        <div className="space-y-2 px-2 pb-2">
          <div className="flex items-center justify-between rounded-lg px-1">
            <span className="text-xs text-sidebar-foreground/70">
              {theme === 'dark' ? t('common.darkMode') : t('common.lightMode')}
            </span>
            <Button
              variant="ghost"
              size="icon"
              className="text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
              aria-label={theme === 'dark' ? t('common.lightMode') : t('common.darkMode')}
              onClick={toggleTheme}
            >
              {theme === 'dark' ? <Sun className="size-4" /> : <Moon className="size-4" />}
            </Button>
          </div>
          <div className="flex items-center justify-between rounded-lg px-1">
            <span className="text-xs text-sidebar-foreground/70">{t('common.language')}</span>
            <Button
              variant="ghost"
              size="sm"
              className="gap-1.5 font-bold text-sidebar-foreground hover:bg-sidebar-accent"
              onClick={toggleLanguage}
              aria-label={t('common.language')}
            >
              <Languages className="size-4" />
              {language === 'fr' ? 'ع' : 'FR'}
            </Button>
          </div>
          <div className="flex items-center gap-3 rounded-lg bg-sidebar-accent px-2 py-2">
            <Avatar className="size-8">
              <AvatarFallback className="bg-gold text-sm font-bold text-white">
                {session.username.charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-white" dir="auto">
                {session.username}
              </p>
              <p className="truncate text-xs text-sidebar-foreground/60">{t(`role.${session.role}`)}</p>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
              aria-label={t('common.logout')}
              onClick={() => void logout()}
            >
              <LogOut className="size-4" />
            </Button>
          </div>
        </div>
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}
