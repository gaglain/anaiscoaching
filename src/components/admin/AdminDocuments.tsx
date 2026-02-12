import { useEffect, useState, useRef } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { FileText, Upload, Loader2, Trash2, Download, Search, FolderOpen } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

interface SharedDocument {
  id: string;
  admin_id: string;
  client_id: string;
  file_name: string;
  file_path: string;
  file_type: string;
  file_size: number;
  description: string | null;
  category: string;
  created_at: string;
  profiles?: { name: string } | null;
}

const CATEGORIES = [
  { value: "general", label: "Général" },
  { value: "programme", label: "Programme d'entraînement" },
  { value: "nutrition", label: "Nutrition" },
  { value: "bilan", label: "Bilan / Suivi" },
  { value: "facture", label: "Facture" },
];

const getCategoryLabel = (value: string) =>
  CATEGORIES.find((c) => c.value === value)?.label || value;

const formatFileSize = (bytes: number) => {
  if (bytes < 1024) return `${bytes} o`;
  if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} Ko`;
  return `${(bytes / 1048576).toFixed(1)} Mo`;
};

const getFileIcon = (type: string) => {
  if (type.includes("pdf")) return "📄";
  if (type.includes("image")) return "🖼️";
  if (type.includes("word") || type.includes("document")) return "📝";
  return "📎";
};

export function AdminDocuments() {
  const { toast } = useToast();
  const { user } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [documents, setDocuments] = useState<SharedDocument[]>([]);
  const [clients, setClients] = useState<{ id: string; name: string }[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterCategory, setFilterCategory] = useState("all");

  // Upload dialog
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadClientId, setUploadClientId] = useState("");
  const [uploadCategory, setUploadCategory] = useState("general");
  const [uploadDescription, setUploadDescription] = useState("");
  const [isUploading, setIsUploading] = useState(false);

  useEffect(() => {
    fetchDocuments();
    fetchClients();
  }, []);

  const fetchClients = async () => {
    const { data } = await supabase.from("profiles").select("id, name").order("name");
    setClients(data || []);
  };

  const fetchDocuments = async () => {
    try {
      const { data, error } = await supabase
        .from("shared_documents")
        .select("*, profiles:client_id(name)")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setDocuments((data as SharedDocument[]) || []);
    } catch (error) {
      console.error("Error fetching documents:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpload = async () => {
    if (!uploadFile || !uploadClientId || !user) return;
    setIsUploading(true);

    try {
      const fileExt = uploadFile.name.split(".").pop();
      const filePath = `${uploadClientId}/${Date.now()}-${uploadFile.name}`;

      const { error: uploadError } = await supabase.storage
        .from("documents")
        .upload(filePath, uploadFile);

      if (uploadError) throw uploadError;

      const { error: insertError } = await supabase
        .from("shared_documents")
        .insert({
          admin_id: user.id,
          client_id: uploadClientId,
          file_name: uploadFile.name,
          file_path: filePath,
          file_type: uploadFile.type,
          file_size: uploadFile.size,
          description: uploadDescription || null,
          category: uploadCategory,
        });

      if (insertError) throw insertError;

      // Send email notification to client
      const client = clients.find((c) => c.id === uploadClientId);
      const clientProfile = client
        ? await supabase.from("profiles").select("email").eq("id", uploadClientId).single()
        : null;

      if (clientProfile?.data?.email) {
        supabase.functions.invoke("send-email", {
          body: {
            type: "new_document",
            to: clientProfile.data.email,
            data: {
              clientName: client?.name || "Client",
              documentName: uploadFile.name,
              category: getCategoryLabel(uploadCategory),
              description: uploadDescription || undefined,
            },
          },
        }).catch((err) => console.error("Email notification error:", err));
      }

      toast({
        title: "Document partagé",
        description: `"${uploadFile.name}" a été envoyé au client.`,
      });

      resetUploadForm();
      fetchDocuments();
    } catch (error: any) {
      toast({
        title: "Erreur d'upload",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
    }
  };

  const deleteDocument = async (doc: SharedDocument) => {
    try {
      await supabase.storage.from("documents").remove([doc.file_path]);
      const { error } = await supabase.from("shared_documents").delete().eq("id", doc.id);
      if (error) throw error;

      toast({ title: "Document supprimé" });
      fetchDocuments();
    } catch (error: any) {
      toast({ title: "Erreur", description: error.message, variant: "destructive" });
    }
  };

  const downloadDocument = async (doc: SharedDocument) => {
    const { data, error } = await supabase.storage
      .from("documents")
      .createSignedUrl(doc.file_path, 60);

    if (error || !data?.signedUrl) {
      toast({ title: "Erreur", description: "Impossible de générer le lien.", variant: "destructive" });
      return;
    }

    window.open(data.signedUrl, "_blank");
  };

  const resetUploadForm = () => {
    setIsUploadOpen(false);
    setUploadFile(null);
    setUploadClientId("");
    setUploadCategory("general");
    setUploadDescription("");
  };

  const filteredDocuments = documents.filter((doc) => {
    const matchesSearch =
      doc.file_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      doc.profiles?.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      doc.description?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = filterCategory === "all" || doc.category === filterCategory;
    return matchesSearch && matchesCategory;
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-secondary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between gap-4">
        <div>
          <h2 className="text-xl font-heading font-semibold text-foreground">Documents partagés</h2>
          <p className="text-muted-foreground">{documents.length} document(s)</p>
        </div>
        <div className="flex gap-2">
          <div className="relative w-full sm:w-56">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Rechercher..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select value={filterCategory} onValueChange={setFilterCategory}>
            <SelectTrigger className="w-[160px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Toutes catégories</SelectItem>
              {CATEGORIES.map((cat) => (
                <SelectItem key={cat.value} value={cat.value}>{cat.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button onClick={() => setIsUploadOpen(true)} className="shrink-0">
            <Upload className="h-4 w-4 mr-2" />
            <span className="hidden sm:inline">Partager</span>
          </Button>
        </div>
      </div>

      {/* Documents list */}
      {filteredDocuments.length === 0 ? (
        <Card className="border-border/50">
          <CardContent className="py-12 text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-secondary/10 mb-4">
              <FolderOpen className="h-8 w-8 text-secondary" />
            </div>
            <p className="text-muted-foreground">
              {searchQuery || filterCategory !== "all" ? "Aucun document trouvé" : "Aucun document partagé"}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {filteredDocuments.map((doc) => (
            <Card key={doc.id} className="border-border/50 hover:border-secondary/30 transition-all">
              <CardContent className="p-4">
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="text-2xl shrink-0">{getFileIcon(doc.file_type)}</span>
                    <div className="min-w-0">
                      <p className="font-medium text-foreground truncate">{doc.file_name}</p>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground flex-wrap">
                        <span>{doc.profiles?.name || "Client inconnu"}</span>
                        <span>•</span>
                        <Badge variant="outline" className="text-xs">
                          {getCategoryLabel(doc.category)}
                        </Badge>
                        <span>•</span>
                        <span>{formatFileSize(doc.file_size)}</span>
                        <span>•</span>
                        <span>{format(new Date(doc.created_at), "d MMM yyyy", { locale: fr })}</span>
                      </div>
                      {doc.description && (
                        <p className="text-sm text-muted-foreground mt-1 truncate">{doc.description}</p>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-2 shrink-0">
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => downloadDocument(doc)}
                      className="border-secondary/30 hover:bg-secondary/5"
                    >
                      <Download className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => deleteDocument(doc)}
                      className="border-destructive/30 text-destructive hover:bg-destructive/5"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Upload Dialog */}
      <Dialog open={isUploadOpen} onOpenChange={(open) => { if (!open) resetUploadForm(); else setIsUploadOpen(true); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Upload className="h-5 w-5 text-secondary" />
              Partager un document
            </DialogTitle>
            <DialogDescription>
              Envoyez un document à un client
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Client</Label>
              <Select value={uploadClientId} onValueChange={setUploadClientId}>
                <SelectTrigger>
                  <SelectValue placeholder="Sélectionner un client" />
                </SelectTrigger>
                <SelectContent>
                  {clients.map((client) => (
                    <SelectItem key={client.id} value={client.id}>{client.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Catégorie</Label>
              <Select value={uploadCategory} onValueChange={setUploadCategory}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map((cat) => (
                    <SelectItem key={cat.value} value={cat.value}>{cat.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Fichier</Label>
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,.jpg,.jpeg,.png,.webp,.doc,.docx"
                className="hidden"
                onChange={(e) => setUploadFile(e.target.files?.[0] || null)}
              />
              <Button
                variant="outline"
                onClick={() => fileInputRef.current?.click()}
                className="w-full justify-start"
              >
                <FileText className="h-4 w-4 mr-2" />
                {uploadFile ? uploadFile.name : "Choisir un fichier..."}
              </Button>
              {uploadFile && (
                <p className="text-xs text-muted-foreground">{formatFileSize(uploadFile.size)}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label>Description (optionnelle)</Label>
              <Textarea
                value={uploadDescription}
                onChange={(e) => setUploadDescription(e.target.value)}
                placeholder="Note pour le client..."
                className="min-h-[80px]"
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              onClick={handleUpload}
              disabled={!uploadFile || !uploadClientId || isUploading}
              className="w-full"
            >
              {isUploading ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Upload className="h-4 w-4 mr-2" />
              )}
              Envoyer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
