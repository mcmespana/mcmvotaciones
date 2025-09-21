import { useState } from 'react';
import { Send, Bell, Users, Target, Clock, Smartphone, Image, Link, Calendar, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';

interface NotificationData {
  title: string;
  message: string;
  channel: string;
  icon?: string;
  actionUrl?: string;
  imageUrl?: string;
  scheduleDate?: string;
  scheduleTime?: string;
  sendImmediately: boolean;
}

const channels = [
  { id: 'all', name: 'Todos los usuarios', audience: '2,847', color: 'bg-primary' },
  { id: 'mcm-europa', name: 'MCM Europa', audience: '1,234', color: 'bg-blue-500' },
  { id: 'mcm-castellon', name: 'MCM Castellón', audience: '856', color: 'bg-green-500' },
  { id: 'mcm-madrid', name: 'MCM Madrid', audience: '423', color: 'bg-red-500' },
  { id: 'beta-testers', name: 'Beta Testers', audience: '89', color: 'bg-purple-500' },
  { id: 'admins', name: 'Administradores', audience: '12', color: 'bg-yellow-500' },
];

const recentNotifications = [
  { id: 1, title: 'Nueva canción añadida', channel: 'Todos los usuarios', sent: '2024-01-15 14:30', status: 'sent' },
  { id: 2, title: 'Mantenimiento programado', channel: 'MCM Europa', sent: '2024-01-14 09:15', status: 'sent' },
  { id: 3, title: 'Evento Jubileo 2025', channel: 'Todos los usuarios', sent: '2024-01-13 16:45', status: 'scheduled' },
];

export function NotificationsSection() {
  const [notification, setNotification] = useState<NotificationData>({
    title: '',
    message: '',
    channel: '',
    icon: '',
    actionUrl: '',
    imageUrl: '',
    scheduleDate: '',
    scheduleTime: '',
    sendImmediately: true,
  });
  
  const { toast } = useToast();

  const handleSendNotification = () => {
    if (!notification.title || !notification.message || !notification.channel) {
      toast({
        title: "Campos requeridos",
        description: "Por favor completa título, mensaje y canal",
        variant: "destructive",
      });
      return;
    }

    // Simulate API call
    toast({
      title: "Notificación enviada",
      description: `Notificación programada para ${channels.find(c => c.id === notification.channel)?.name}`,
    });

    // Reset form
    setNotification({
      title: '',
      message: '',
      channel: '',
      icon: '',
      actionUrl: '',
      imageUrl: '',
      scheduleDate: '',
      scheduleTime: '',
      sendImmediately: true,
    });
  };

  const selectedChannel = channels.find(c => c.id === notification.channel);

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-primary bg-clip-text text-transparent">
            Centro de Notificaciones
          </h1>
          <p className="text-muted-foreground mt-2">
            Envía notificaciones push a los usuarios de la aplicación móvil
          </p>
        </div>
        <div className="flex items-center space-x-2 text-sm text-muted-foreground">
          <Bell className="w-4 h-4 text-primary" />
          <span>Sistema activo</span>
        </div>
      </div>

      <Tabs defaultValue="compose" className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="compose">Crear Notificación</TabsTrigger>
          <TabsTrigger value="history">Historial</TabsTrigger>
          <TabsTrigger value="analytics">Estadísticas</TabsTrigger>
        </TabsList>

        <TabsContent value="compose" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Main Form */}
            <div className="lg:col-span-2 space-y-6">
              <Card className="bg-card/50 backdrop-blur-sm border-border/50">
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Send className="w-5 h-5 mr-2 text-primary" />
                    Componer Notificación
                  </CardTitle>
                  <CardDescription>
                    Configura el contenido y destino de tu notificación push
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="title">Título *</Label>
                      <Input
                        id="title"
                        placeholder="Ej: Nueva canción disponible"
                        value={notification.title}
                        onChange={(e) => setNotification({ ...notification, title: e.target.value })}
                        className="bg-input border-border/50"
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="channel">Canal de destino *</Label>
                      <Select value={notification.channel} onValueChange={(value) => setNotification({ ...notification, channel: value })}>
                        <SelectTrigger className="bg-input border-border/50">
                          <SelectValue placeholder="Selecciona un canal" />
                        </SelectTrigger>
                        <SelectContent>
                          {channels.map((channel) => (
                            <SelectItem key={channel.id} value={channel.id}>
                              <div className="flex items-center space-x-2">
                                <div className={`w-2 h-2 rounded-full ${channel.color}`} />
                                <span>{channel.name}</span>
                                <Badge variant="secondary" className="ml-auto">
                                  {channel.audience}
                                </Badge>
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="message">Mensaje *</Label>
                    <Textarea
                      id="message"
                      placeholder="Escribe el contenido de tu notificación..."
                      value={notification.message}
                      onChange={(e) => setNotification({ ...notification, message: e.target.value })}
                      className="bg-input border-border/50 min-h-[100px]"
                    />
                    <div className="text-xs text-muted-foreground">
                      {notification.message.length}/160 caracteres
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="icon">URL del icono</Label>
                      <Input
                        id="icon"
                        placeholder="https://example.com/icon.png"
                        value={notification.icon}
                        onChange={(e) => setNotification({ ...notification, icon: e.target.value })}
                        className="bg-input border-border/50"
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="actionUrl">URL de acción</Label>
                      <Input
                        id="actionUrl"
                        placeholder="https://app.com/action"
                        value={notification.actionUrl}
                        onChange={(e) => setNotification({ ...notification, actionUrl: e.target.value })}
                        className="bg-input border-border/50"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="imageUrl">URL de imagen (opcional)</Label>
                    <Input
                      id="imageUrl"
                      placeholder="https://example.com/image.jpg"
                      value={notification.imageUrl}
                      onChange={(e) => setNotification({ ...notification, imageUrl: e.target.value })}
                      className="bg-input border-border/50"
                    />
                  </div>

                  <div className="space-y-4">
                    <div className="flex items-center space-x-2">
                      <Switch
                        id="sendImmediately"
                        checked={notification.sendImmediately}
                        onCheckedChange={(checked) => setNotification({ ...notification, sendImmediately: checked })}
                      />
                      <Label htmlFor="sendImmediately">Enviar inmediatamente</Label>
                    </div>

                    {!notification.sendImmediately && (
                      <div className="grid grid-cols-2 gap-4 p-4 bg-muted/20 rounded-lg border border-border/30">
                        <div className="space-y-2">
                          <Label htmlFor="scheduleDate">Fecha programada</Label>
                          <Input
                            type="date"
                            id="scheduleDate"
                            value={notification.scheduleDate}
                            onChange={(e) => setNotification({ ...notification, scheduleDate: e.target.value })}
                            className="bg-input border-border/50"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="scheduleTime">Hora programada</Label>
                          <Input
                            type="time"
                            id="scheduleTime"
                            value={notification.scheduleTime}
                            onChange={(e) => setNotification({ ...notification, scheduleTime: e.target.value })}
                            className="bg-input border-border/50"
                          />
                        </div>
                      </div>
                    )}
                  </div>

                  <Button 
                    onClick={handleSendNotification}
                    className="w-full tech-glow relative overflow-hidden group"
                    size="lg"
                  >
                    <div className="absolute inset-0 bg-gradient-primary opacity-0 group-hover:opacity-10 transition-opacity" />
                    <Send className="w-4 h-4 mr-2" />
                    {notification.sendImmediately ? 'Enviar Ahora' : 'Programar Envío'}
                  </Button>
                </CardContent>
              </Card>
            </div>

            {/* Preview and Statistics */}
            <div className="space-y-6">
              {/* Mobile Preview */}
              <Card className="bg-card/50 backdrop-blur-sm border-border/50">
                <CardHeader>
                  <CardTitle className="flex items-center text-sm">
                    <Smartphone className="w-4 h-4 mr-2 text-primary" />
                    Vista previa móvil
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="bg-gray-900 rounded-2xl p-4 relative">
                    <div className="bg-gray-800 rounded-lg p-3 space-y-2">
                      <div className="flex items-start space-x-3">
                        <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
                          <Bell className="w-4 h-4 text-primary-foreground" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-white font-medium text-sm truncate">
                            {notification.title || 'Título de la notificación'}
                          </div>
                          <div className="text-gray-300 text-xs mt-1 line-clamp-2">
                            {notification.message || 'El mensaje de la notificación aparecerá aquí...'}
                          </div>
                          {notification.imageUrl && (
                            <div className="mt-2 w-full h-20 bg-gray-700 rounded border-2 border-dashed border-gray-600 flex items-center justify-center">
                              <Image className="w-6 h-6 text-gray-500" />
                            </div>
                          )}
                          <div className="text-gray-400 text-xs mt-2">
                            hace un momento
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Channel Statistics */}
              <Card className="bg-card/50 backdrop-blur-sm border-border/50">
                <CardHeader>
                  <CardTitle className="flex items-center text-sm">
                    <Target className="w-4 h-4 mr-2 text-primary" />
                    Audiencia objetivo
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {selectedChannel ? (
                    <div className="space-y-3">
                      <div className="flex items-center space-x-2">
                        <div className={`w-3 h-3 rounded-full ${selectedChannel.color}`} />
                        <span className="font-medium">{selectedChannel.name}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">Usuarios activos:</span>
                        <Badge variant="secondary" className="bg-primary/10 text-primary">
                          {selectedChannel.audience}
                        </Badge>
                      </div>
                      <div className="text-xs text-muted-foreground">
                        Tasa de apertura promedio: 78%
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-4 text-muted-foreground">
                      <Users className="w-8 h-8 mx-auto mb-2 opacity-50" />
                      <p className="text-sm">Selecciona un canal para ver estadísticas</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="history" className="space-y-4">
          <Card className="bg-card/50 backdrop-blur-sm border-border/50">
            <CardHeader>
              <CardTitle className="flex items-center">
                <Clock className="w-5 h-5 mr-2 text-primary" />
                Historial de Notificaciones
              </CardTitle>
              <CardDescription>
                Últimas notificaciones enviadas y programadas
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {recentNotifications.map((notif) => (
                  <div key={notif.id} className="flex items-center justify-between p-3 bg-muted/20 rounded-lg border border-border/30">
                    <div>
                      <div className="font-medium">{notif.title}</div>
                      <div className="text-sm text-muted-foreground">
                        Canal: {notif.channel} • {notif.sent}
                      </div>
                    </div>
                    <Badge variant={notif.status === 'sent' ? 'default' : 'secondary'}>
                      {notif.status === 'sent' ? (
                        <>
                          <CheckCircle className="w-3 h-3 mr-1" />
                          Enviado
                        </>
                      ) : (
                        <>
                          <Calendar className="w-3 h-3 mr-1" />
                          Programado
                        </>
                      )}
                    </Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="analytics" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card className="bg-card/50 backdrop-blur-sm border-border/50">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Enviadas hoy</p>
                    <p className="text-2xl font-bold text-primary">24</p>
                  </div>
                  <Send className="w-8 h-8 text-primary/50" />
                </div>
              </CardContent>
            </Card>
            
            <Card className="bg-card/50 backdrop-blur-sm border-border/50">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Tasa de apertura</p>
                    <p className="text-2xl font-bold text-success">78%</p>
                  </div>
                  <Target className="w-8 h-8 text-success/50" />
                </div>
              </CardContent>
            </Card>
            
            <Card className="bg-card/50 backdrop-blur-sm border-border/50">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Usuarios activos</p>
                    <p className="text-2xl font-bold text-accent">2,847</p>
                  </div>
                  <Users className="w-8 h-8 text-accent/50" />
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}