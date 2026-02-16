import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Upload, ImageIcon, Star, Paintbrush, Shapes } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface SavedAssetsPanelProps {
  onAddImage: (src: string, name?: string) => void;
}

export function SavedAssetsPanel({ onAddImage }: SavedAssetsPanelProps) {
  const [playerImages, setPlayerImages] = useState<any[]>([]);
  const [logos, setLogos] = useState<any[]>([]);
  const [backgrounds, setBackgrounds] = useState<any[]>([]);
  const [assets, setAssets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

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

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      if (ev.target?.result) {
        onAddImage(ev.target.result as string, file.name);
      }
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const renderGrid = (items: any[]) => (
    <div className="grid grid-cols-2 gap-1.5 p-2">
      {items.map(item => (
        <button
          key={item.id}
          onClick={() => onAddImage(item.file_url, item.title)}
          className="group relative aspect-square rounded-md overflow-hidden border border-border/50 hover:border-primary transition-colors"
        >
          <img src={item.file_url} alt={item.title} className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors flex items-end">
            <span className="text-[9px] text-white p-1 opacity-0 group-hover:opacity-100 truncate w-full">{item.title}</span>
          </div>
        </button>
      ))}
      {items.length === 0 && <p className="col-span-2 text-center text-xs text-muted-foreground py-4">No items yet</p>}
    </div>
  );

  return (
    <div className="flex flex-col h-full">
      <div className="px-3 py-2 border-b flex items-center justify-between">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Saved Assets</h3>
        <label className="cursor-pointer">
          <input type="file" accept="image/*" onChange={handleUpload} className="hidden" />
          <div className="h-6 w-6 flex items-center justify-center rounded hover:bg-muted transition-colors">
            <Upload className="h-3 w-3" />
          </div>
        </label>
      </div>
      <Tabs defaultValue="players" className="flex-1 flex flex-col overflow-hidden">
        <TabsList className="mx-2 mt-2 h-7 grid grid-cols-4">
          <TabsTrigger value="players" className="text-[9px] h-6 px-1"><ImageIcon className="h-3 w-3" /></TabsTrigger>
          <TabsTrigger value="logos" className="text-[9px] h-6 px-1"><Star className="h-3 w-3" /></TabsTrigger>
          <TabsTrigger value="backgrounds" className="text-[9px] h-6 px-1"><Paintbrush className="h-3 w-3" /></TabsTrigger>
          <TabsTrigger value="assets" className="text-[9px] h-6 px-1"><Shapes className="h-3 w-3" /></TabsTrigger>
        </TabsList>
        <div className="flex-1 overflow-y-auto">
          <TabsContent value="players" className="m-0">{renderGrid(playerImages)}</TabsContent>
          <TabsContent value="logos" className="m-0">{renderGrid(logos)}</TabsContent>
          <TabsContent value="backgrounds" className="m-0">{renderGrid(backgrounds)}</TabsContent>
          <TabsContent value="assets" className="m-0">{renderGrid(assets)}</TabsContent>
        </div>
      </Tabs>
    </div>
  );
}
