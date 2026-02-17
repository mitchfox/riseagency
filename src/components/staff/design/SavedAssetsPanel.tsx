import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Upload, ImageIcon, Star, Paintbrush, Shapes, FolderOpen } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface SavedAssetsPanelProps {
  onAddImage: (src: string, name?: string) => void;
}

export function SavedAssetsPanel({ onAddImage }: SavedAssetsPanelProps) {
  const [playerImages, setPlayerImages] = useState<any[]>([]);
  const [logos, setLogos] = useState<any[]>([]);
  const [backgrounds, setBackgrounds] = useState<any[]>([]);
  const [assets, setAssets] = useState<any[]>([]);
  const [localUploads, setLocalUploads] = useState<{ name: string; url: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const fetchAssets = async () => {
      setLoading(true);
      const [playersRes, logosRes, bgRes, assetsRes] = await Promise.all([
        supabase.from('marketing_gallery').select('*').eq('category', 'players').eq('file_type', 'image').order('created_at', { ascending: false }).limit(50),
        supabase.from('marketing_gallery').select('*').eq('category', 'logos').eq('file_type', 'image').order('created_at', { ascending: false }).limit(50),
        supabase.from('marketing_gallery').select('*').eq('category', 'backgrounds').eq('file_type', 'image').order('created_at', { ascending: false }).limit(50),
        supabase.from('marketing_gallery').select('*').eq('category', 'assets').eq('file_type', 'image').order('created_at', { ascending: false }).limit(50),
      ]);
      setPlayerImages(playersRes.data || []);
      setLogos(logosRes.data || []);
      setBackgrounds(bgRes.data || []);
      setAssets(assetsRes.data || []);
      setLoading(false);
    };
    fetchAssets();
  }, []);

  const handleUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      if (ev.target?.result) {
        const url = ev.target.result as string;
        setLocalUploads(prev => [{ name: file.name, url }, ...prev]);
        onAddImage(url, file.name);
      }
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const renderGrid = (items: any[], isLocal?: boolean) => (
    <div className="grid grid-cols-2 gap-1.5 p-2">
      {items.map((item, i) => (
        <button
          key={isLocal ? `local-${i}` : item.id}
          onClick={() => onAddImage(isLocal ? item.url : item.file_url, isLocal ? item.name : item.title)}
          className="group relative aspect-square rounded-md overflow-hidden border border-border/50 hover:border-primary transition-colors"
        >
          <img src={isLocal ? item.url : item.file_url} alt={isLocal ? item.name : item.title} className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors flex items-end">
            <span className="text-[9px] text-white p-1 opacity-0 group-hover:opacity-100 truncate w-full">
              {isLocal ? item.name : item.title}
            </span>
          </div>
        </button>
      ))}
      {items.length === 0 && <p className="col-span-2 text-center text-xs text-muted-foreground py-4">No items yet</p>}
    </div>
  );

  return (
    <div className="flex flex-col h-full">
      <Tabs defaultValue="uploads" className="flex-1 flex flex-col overflow-hidden">
        <TabsList className="mx-2 mt-2 h-8 grid grid-cols-5 gap-0.5">
          <TabsTrigger value="uploads" className="text-[9px] h-7 px-1 flex flex-col gap-0">
            <Upload className="h-3 w-3" />
            <span className="text-[8px]">Upload</span>
          </TabsTrigger>
          <TabsTrigger value="players" className="text-[9px] h-7 px-1 flex flex-col gap-0">
            <ImageIcon className="h-3 w-3" />
            <span className="text-[8px]">Players</span>
          </TabsTrigger>
          <TabsTrigger value="logos" className="text-[9px] h-7 px-1 flex flex-col gap-0">
            <Star className="h-3 w-3" />
            <span className="text-[8px]">Logos</span>
          </TabsTrigger>
          <TabsTrigger value="backgrounds" className="text-[9px] h-7 px-1 flex flex-col gap-0">
            <Paintbrush className="h-3 w-3" />
            <span className="text-[8px]">BGs</span>
          </TabsTrigger>
          <TabsTrigger value="assets" className="text-[9px] h-7 px-1 flex flex-col gap-0">
            <Shapes className="h-3 w-3" />
            <span className="text-[8px]">Assets</span>
          </TabsTrigger>
        </TabsList>
        <div className="flex-1 overflow-y-auto">
          <TabsContent value="uploads" className="m-0">
            <div className="p-2">
              <input ref={fileRef} type="file" accept="image/*" onChange={handleUpload} className="hidden" />
              <Button variant="outline" size="sm" className="w-full h-8 text-xs gap-1 mb-2" onClick={() => fileRef.current?.click()}>
                <Upload className="h-3.5 w-3.5" /> Upload Image
              </Button>
              <p className="text-[10px] text-muted-foreground mb-2">Files uploaded here are added directly to this project session.</p>
            </div>
            {renderGrid(localUploads, true)}
          </TabsContent>
          <TabsContent value="players" className="m-0">{renderGrid(playerImages)}</TabsContent>
          <TabsContent value="logos" className="m-0">{renderGrid(logos)}</TabsContent>
          <TabsContent value="backgrounds" className="m-0">{renderGrid(backgrounds)}</TabsContent>
          <TabsContent value="assets" className="m-0">{renderGrid(assets)}</TabsContent>
        </div>
      </Tabs>
    </div>
  );
}
