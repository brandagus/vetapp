import { useState, useRef, useEffect, useMemo } from "react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";
import {
  MessageCircle,
  Settings,
  Send,
  Bot,
  User,
  Search,
  Phone,
  Clock,
  CheckCheck,
  Check,
  XCircle,
  BarChart3,
  Zap,
  Archive,
  Link2,
} from "lucide-react";

export default function AdminWhatsApp() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState("conversations");

  if (user?.role !== "admin") {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-muted-foreground">No tenés permisos para acceder a esta sección.</p>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 space-y-6">
      <div className="flex items-center gap-3">
        <div className="p-2 rounded-lg bg-green-100 text-green-700">
          <MessageCircle className="h-6 w-6" />
        </div>
        <div>
          <h1 className="text-2xl font-bold font-display text-foreground">WhatsApp Business</h1>
          <p className="text-sm text-muted-foreground">
            Gestión de mensajes, respuestas automáticas con IA y configuración
          </p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3 max-w-md">
          <TabsTrigger value="conversations" className="gap-1.5">
            <MessageCircle className="h-4 w-4" />
            Chats
          </TabsTrigger>
          <TabsTrigger value="settings" className="gap-1.5">
            <Settings className="h-4 w-4" />
            Configuración
          </TabsTrigger>
          <TabsTrigger value="stats" className="gap-1.5">
            <BarChart3 className="h-4 w-4" />
            Estadísticas
          </TabsTrigger>
        </TabsList>

        <TabsContent value="conversations" className="mt-4">
          <ConversationsPanel />
        </TabsContent>

        <TabsContent value="settings" className="mt-4">
          <SettingsPanel />
        </TabsContent>

        <TabsContent value="stats" className="mt-4">
          <StatsPanel />
        </TabsContent>
      </Tabs>
    </div>
  );
}

// ─── Conversations Panel ──────────────────────────────────────────────────────

function ConversationsPanel() {
  const [selectedConvId, setSelectedConvId] = useState<number | null>(null);
  const [search, setSearch] = useState("");

  const { data: conversations, isLoading } = trpc.whatsapp.listConversations.useQuery({
    search: search || undefined,
    status: "active",
  });

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 h-[calc(100vh-280px)] min-h-[500px]">
      {/* Conversation List */}
      <Card className="lg:col-span-1 flex flex-col">
        <CardHeader className="pb-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar conversación..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
        </CardHeader>
        <CardContent className="flex-1 overflow-hidden p-0">
          <ScrollArea className="h-full">
            {isLoading ? (
              <div className="p-4 text-center text-muted-foreground text-sm">Cargando...</div>
            ) : !conversations?.length ? (
              <div className="p-6 text-center">
                <MessageCircle className="h-10 w-10 text-muted-foreground/40 mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">
                  No hay conversaciones aún.
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Las conversaciones aparecerán cuando los clientes escriban por WhatsApp.
                </p>
              </div>
            ) : (
              <div className="divide-y">
                {conversations.map((conv) => (
                  <button
                    key={conv.id}
                    onClick={() => setSelectedConvId(conv.id)}
                    className={`w-full text-left p-3 hover:bg-accent/50 transition-colors ${
                      selectedConvId === conv.id ? "bg-accent" : ""
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center shrink-0">
                        <User className="h-5 w-5 text-green-700" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <span className="font-medium text-sm truncate">
                            {conv.contactName || conv.waId}
                          </span>
                          {conv.unreadCount > 0 && (
                            <Badge variant="default" className="bg-green-600 text-white text-xs ml-1">
                              {conv.unreadCount}
                            </Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-1 mt-0.5">
                          {conv.aiEnabled && (
                            <Bot className="h-3 w-3 text-blue-500 shrink-0" />
                          )}
                          <p className="text-xs text-muted-foreground truncate">
                            {conv.lastMessage?.body || "Sin mensajes"}
                          </p>
                        </div>
                        <div className="flex items-center gap-2 mt-1">
                          <Phone className="h-3 w-3 text-muted-foreground" />
                          <span className="text-xs text-muted-foreground">{conv.waId}</span>
                          {conv.ownerName && (
                            <>
                              <span className="text-xs text-muted-foreground">·</span>
                              <Link2 className="h-3 w-3 text-primary" />
                              <span className="text-xs text-primary">{conv.ownerName}</span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </ScrollArea>
        </CardContent>
      </Card>

      {/* Message Panel */}
      <Card className="lg:col-span-2 flex flex-col">
        {selectedConvId ? (
          <MessagePanel conversationId={selectedConvId} />
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <MessageCircle className="h-12 w-12 text-muted-foreground/30 mx-auto mb-3" />
              <p className="text-muted-foreground">
                Seleccioná una conversación para ver los mensajes
              </p>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}

// ─── Message Panel ────────────────────────────────────────────────────────────

function MessagePanel({ conversationId }: { conversationId: number }) {
  const [newMessage, setNewMessage] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const utils = trpc.useUtils();

  const { data: messages, isLoading } = trpc.whatsapp.getMessages.useQuery({
    conversationId,
    limit: 100,
  });

  const sendMutation = trpc.whatsapp.sendMessage.useMutation({
    onSuccess: () => {
      setNewMessage("");
      utils.whatsapp.getMessages.invalidate({ conversationId });
      utils.whatsapp.listConversations.invalidate();
      toast.success("Mensaje enviado");
    },
    onError: (err) => {
      toast.error("Error al enviar: " + err.message);
    },
  });

  const toggleAIMutation = trpc.whatsapp.toggleAI.useMutation({
    onSuccess: () => {
      utils.whatsapp.listConversations.invalidate();
      toast.success("IA actualizada");
    },
  });

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = () => {
    if (!newMessage.trim()) return;
    sendMutation.mutate({ conversationId, body: newMessage.trim() });
  };

  return (
    <>
      <CardHeader className="pb-2 border-b">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">Conversación</CardTitle>
          <div className="flex items-center gap-2">
            <Label htmlFor="ai-toggle" className="text-xs text-muted-foreground">
              IA Auto
            </Label>
            <Switch
              id="ai-toggle"
              onCheckedChange={(checked) =>
                toggleAIMutation.mutate({ conversationId, aiEnabled: checked })
              }
            />
          </div>
        </div>
      </CardHeader>

      <CardContent className="flex-1 overflow-hidden p-0">
        <ScrollArea className="h-[calc(100%-1px)] p-4">
          {isLoading ? (
            <div className="text-center text-muted-foreground text-sm py-8">Cargando mensajes...</div>
          ) : !messages?.length ? (
            <div className="text-center text-muted-foreground text-sm py-8">No hay mensajes</div>
          ) : (
            <div className="space-y-3">
              {messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex ${msg.direction === "outgoing" ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`max-w-[80%] rounded-2xl px-4 py-2.5 ${
                      msg.direction === "outgoing"
                        ? "bg-green-600 text-white rounded-br-sm"
                        : "bg-muted text-foreground rounded-bl-sm"
                    }`}
                  >
                    <p className="text-sm whitespace-pre-wrap">{msg.body}</p>
                    <div
                      className={`flex items-center gap-1 mt-1 ${
                        msg.direction === "outgoing" ? "justify-end" : "justify-start"
                      }`}
                    >
                      {msg.aiGenerated && (
                        <Bot className="h-3 w-3 opacity-60" />
                      )}
                      <span className="text-[10px] opacity-60">
                        {new Date(msg.createdAt).toLocaleTimeString("es-AR", {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                      {msg.direction === "outgoing" && (
                        <MessageStatus status={msg.status} />
                      )}
                    </div>
                  </div>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>
          )}
        </ScrollArea>
      </CardContent>

      {/* Message Input */}
      <div className="p-3 border-t">
        <div className="flex gap-2">
          <Input
            placeholder="Escribí un mensaje..."
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
            disabled={sendMutation.isPending}
          />
          <Button
            onClick={handleSend}
            disabled={!newMessage.trim() || sendMutation.isPending}
            size="icon"
            className="bg-green-600 hover:bg-green-700 shrink-0"
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </>
  );
}

function MessageStatus({ status }: { status: string }) {
  switch (status) {
    case "read":
      return <CheckCheck className="h-3 w-3 text-blue-300" />;
    case "delivered":
      return <CheckCheck className="h-3 w-3 opacity-60" />;
    case "sent":
      return <Check className="h-3 w-3 opacity-60" />;
    case "failed":
      return <XCircle className="h-3 w-3 text-red-400" />;
    default:
      return null;
  }
}

// ─── Settings Panel ───────────────────────────────────────────────────────────

function SettingsPanel() {
  const { data: settings, isLoading } = trpc.whatsapp.getSettings.useQuery();
  const utils = trpc.useUtils();

  const [form, setForm] = useState({
    isActive: false,
    aiAutoReply: true,
    businessName: "",
    welcomeMessage: "",
    outsideHoursMessage: "",
    businessHoursStart: "09:00",
    businessHoursEnd: "18:00",
    workDays: "1,2,3,4,5",
  });

  const [quickReplies, setQuickReplies] = useState<
    Array<{ id: string; title: string; body: string }>
  >([]);

  useEffect(() => {
    if (settings) {
      setForm({
        isActive: settings.isActive ?? false,
        aiAutoReply: settings.aiAutoReply ?? true,
        businessName: settings.businessName || "",
        welcomeMessage: settings.welcomeMessage || "",
        outsideHoursMessage: settings.outsideHoursMessage || "",
        businessHoursStart: settings.businessHoursStart || "09:00",
        businessHoursEnd: settings.businessHoursEnd || "18:00",
        workDays: settings.workDays || "1,2,3,4,5",
      });
      try {
        setQuickReplies(JSON.parse(settings.quickReplies || "[]"));
      } catch {
        setQuickReplies([]);
      }
    }
  }, [settings]);

  const updateMutation = trpc.whatsapp.updateSettings.useMutation({
    onSuccess: () => {
      utils.whatsapp.getSettings.invalidate();
      toast.success("Configuración guardada");
    },
    onError: (err) => toast.error("Error: " + err.message),
  });

  const handleSave = () => {
    updateMutation.mutate({
      ...form,
      quickReplies: JSON.stringify(quickReplies),
    });
  };

  if (isLoading) {
    return <div className="text-center py-8 text-muted-foreground">Cargando configuración...</div>;
  }

  return (
    <div className="space-y-6 max-w-2xl">
      {/* Connection Status */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Zap className="h-5 w-5" />
            Estado de Conexión
          </CardTitle>
          <CardDescription>
            Configuración de la API de WhatsApp Business
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
            <div>
              <p className="font-medium text-sm">API Configurada</p>
              <p className="text-xs text-muted-foreground">
                Token de acceso, Phone Number ID y Verify Token
              </p>
            </div>
            <Badge variant={settings?.isConfigured ? "default" : "destructive"}>
              {settings?.isConfigured ? "Configurada" : "No configurada"}
            </Badge>
          </div>

          <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
            <div>
              <p className="font-medium text-sm">URL del Webhook</p>
              <p className="text-xs text-muted-foreground font-mono">
                {window.location.origin}/api/whatsapp/webhook
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                navigator.clipboard.writeText(
                  `${window.location.origin}/api/whatsapp/webhook`
                );
                toast.success("URL copiada al portapapeles");
              }}
            >
              Copiar
            </Button>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <Label className="font-medium">Integración Activa</Label>
              <p className="text-xs text-muted-foreground">
                Activar/desactivar el procesamiento de mensajes
              </p>
            </div>
            <Switch
              checked={form.isActive}
              onCheckedChange={(checked) => setForm({ ...form, isActive: checked })}
            />
          </div>
        </CardContent>
      </Card>

      {/* AI Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Bot className="h-5 w-5" />
            Respuestas con IA
          </CardTitle>
          <CardDescription>
            Configuración del asistente virtual con inteligencia artificial
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <Label className="font-medium">Respuesta Automática con IA</Label>
              <p className="text-xs text-muted-foreground">
                El bot responde automáticamente usando IA en español
              </p>
            </div>
            <Switch
              checked={form.aiAutoReply}
              onCheckedChange={(checked) => setForm({ ...form, aiAutoReply: checked })}
            />
          </div>

          <div className="space-y-2">
            <Label>Nombre del Negocio</Label>
            <Input
              value={form.businessName}
              onChange={(e) => setForm({ ...form, businessName: e.target.value })}
              placeholder="Dra Branda Veterinaria"
            />
          </div>

          <div className="space-y-2">
            <Label>Mensaje de Bienvenida</Label>
            <Textarea
              value={form.welcomeMessage}
              onChange={(e) => setForm({ ...form, welcomeMessage: e.target.value })}
              placeholder="¡Hola! 🐾 Bienvenido/a..."
              rows={3}
            />
          </div>

          <div className="space-y-2">
            <Label>Mensaje Fuera de Horario</Label>
            <Textarea
              value={form.outsideHoursMessage}
              onChange={(e) => setForm({ ...form, outsideHoursMessage: e.target.value })}
              placeholder="Gracias por escribirnos. En este momento estamos fuera de horario..."
              rows={3}
            />
          </div>
        </CardContent>
      </Card>

      {/* Business Hours */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Horario de Atención
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Hora de Inicio</Label>
              <Input
                type="time"
                value={form.businessHoursStart}
                onChange={(e) => setForm({ ...form, businessHoursStart: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Hora de Fin</Label>
              <Input
                type="time"
                value={form.businessHoursEnd}
                onChange={(e) => setForm({ ...form, businessHoursEnd: e.target.value })}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Días Laborales</Label>
            <div className="flex flex-wrap gap-2">
              {[
                { value: "0", label: "Dom" },
                { value: "1", label: "Lun" },
                { value: "2", label: "Mar" },
                { value: "3", label: "Mié" },
                { value: "4", label: "Jue" },
                { value: "5", label: "Vie" },
                { value: "6", label: "Sáb" },
              ].map((day) => {
                const selected = form.workDays.split(",").includes(day.value);
                return (
                  <Button
                    key={day.value}
                    variant={selected ? "default" : "outline"}
                    size="sm"
                    onClick={() => {
                      const days = form.workDays.split(",").filter(Boolean);
                      const newDays = selected
                        ? days.filter((d) => d !== day.value)
                        : [...days, day.value];
                      setForm({ ...form, workDays: newDays.sort().join(",") });
                    }}
                  >
                    {day.label}
                  </Button>
                );
              })}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Quick Replies */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Respuestas Rápidas</CardTitle>
          <CardDescription>
            Respuestas predefinidas que se pueden enviar con un clic
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {quickReplies.map((qr, index) => (
            <div key={index} className="flex gap-2 items-start p-3 rounded-lg border">
              <div className="flex-1 space-y-2">
                <Input
                  value={qr.title}
                  onChange={(e) => {
                    const updated = [...quickReplies];
                    updated[index] = { ...qr, title: e.target.value };
                    setQuickReplies(updated);
                  }}
                  placeholder="Título"
                  className="text-sm"
                />
                <Textarea
                  value={qr.body}
                  onChange={(e) => {
                    const updated = [...quickReplies];
                    updated[index] = { ...qr, body: e.target.value };
                    setQuickReplies(updated);
                  }}
                  placeholder="Texto del mensaje"
                  rows={2}
                  className="text-sm"
                />
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="text-destructive"
                onClick={() => {
                  setQuickReplies(quickReplies.filter((_, i) => i !== index));
                }}
              >
                ×
              </Button>
            </div>
          ))}
          <Button
            variant="outline"
            size="sm"
            onClick={() =>
              setQuickReplies([
                ...quickReplies,
                { id: `qr_${Date.now()}`, title: "", body: "" },
              ])
            }
          >
            + Agregar Respuesta Rápida
          </Button>
        </CardContent>
      </Card>

      {/* Save Button */}
      <div className="flex justify-end">
        <Button
          onClick={handleSave}
          disabled={updateMutation.isPending}
          className="bg-green-600 hover:bg-green-700"
        >
          {updateMutation.isPending ? "Guardando..." : "Guardar Configuración"}
        </Button>
      </div>
    </div>
  );
}

// ─── Stats Panel ──────────────────────────────────────────────────────────────

function StatsPanel() {
  const { data: stats, isLoading } = trpc.whatsapp.getStats.useQuery();

  if (isLoading) {
    return <div className="text-center py-8 text-muted-foreground">Cargando estadísticas...</div>;
  }

  const statCards = [
    {
      label: "Conversaciones Totales",
      value: stats?.totalConversations || 0,
      icon: MessageCircle,
      color: "text-green-600",
      bg: "bg-green-100",
    },
    {
      label: "Conversaciones Activas",
      value: stats?.activeConversations || 0,
      icon: Zap,
      color: "text-blue-600",
      bg: "bg-blue-100",
    },
    {
      label: "Mensajes Totales",
      value: stats?.totalMessages || 0,
      icon: Send,
      color: "text-purple-600",
      bg: "bg-purple-100",
    },
    {
      label: "Respuestas IA",
      value: stats?.aiMessages || 0,
      icon: Bot,
      color: "text-amber-600",
      bg: "bg-amber-100",
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {statCards.map((stat) => (
        <Card key={stat.label}>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className={`p-2.5 rounded-lg ${stat.bg}`}>
                <stat.icon className={`h-5 w-5 ${stat.color}`} />
              </div>
              <div>
                <p className="text-2xl font-bold">{stat.value}</p>
                <p className="text-xs text-muted-foreground">{stat.label}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
