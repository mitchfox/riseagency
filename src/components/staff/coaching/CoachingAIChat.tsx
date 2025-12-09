import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Send, Bot, User, Save, Loader2, Plus, Trash2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

type SaveTarget = 'coaching_drills' | 'coaching_exercises' | 'coaching_sessions' | 'coaching_programmes' | 'coaching_analysis' | 'coaching_aphorisms';

const SAVE_TARGETS: { value: SaveTarget; label: string }[] = [
  { value: 'coaching_drills', label: 'Drill' },
  { value: 'coaching_exercises', label: 'Exercise' },
  { value: 'coaching_sessions', label: 'Session' },
  { value: 'coaching_programmes', label: 'Programme' },
  { value: 'coaching_analysis', label: 'Analysis' },
  { value: 'coaching_aphorisms', label: 'Aphorism' },
];

const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ai-coaching-chat`;

export function CoachingAIChat() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [saveDialogOpen, setSaveDialogOpen] = useState(false);
  const [selectedMessage, setSelectedMessage] = useState<string>('');
  const [saveTarget, setSaveTarget] = useState<SaveTarget>('coaching_drills');
  const [saveTitle, setSaveTitle] = useState('');
  const [saveDescription, setSaveDescription] = useState('');
  const [saveContent, setSaveContent] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const sendMessage = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage: Message = { role: 'user', content: input.trim() };
    const newMessages = [...messages, userMessage];
    setMessages(newMessages);
    setInput('');
    setIsLoading(true);

    let assistantContent = '';

    try {
      const response = await fetch(CHAT_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({ messages: newMessages }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to get response');
      }

      if (!response.body) throw new Error('No response body');

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });

        let newlineIndex: number;
        while ((newlineIndex = buffer.indexOf('\n')) !== -1) {
          let line = buffer.slice(0, newlineIndex);
          buffer = buffer.slice(newlineIndex + 1);

          if (line.endsWith('\r')) line = line.slice(0, -1);
          if (line.startsWith(':') || line.trim() === '') continue;
          if (!line.startsWith('data: ')) continue;

          const jsonStr = line.slice(6).trim();
          if (jsonStr === '[DONE]') break;

          try {
            const parsed = JSON.parse(jsonStr);
            const content = parsed.choices?.[0]?.delta?.content;
            if (content) {
              assistantContent += content;
              setMessages(prev => {
                const last = prev[prev.length - 1];
                if (last?.role === 'assistant') {
                  return prev.map((m, i) => 
                    i === prev.length - 1 ? { ...m, content: assistantContent } : m
                  );
                }
                return [...prev, { role: 'assistant', content: assistantContent }];
              });
            }
          } catch {
            buffer = line + '\n' + buffer;
            break;
          }
        }
      }
    } catch (error) {
      console.error('Chat error:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to send message');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveClick = (content: string) => {
    setSelectedMessage(content);
    setSaveContent(content);
    setSaveTitle('');
    setSaveDescription('');
    setSaveDialogOpen(true);
  };

  const handleSave = async () => {
    if (!saveTitle.trim()) {
      toast.error('Please enter a title');
      return;
    }

    setIsSaving(true);

    try {
      let insertData: Record<string, unknown> = {
        title: saveTitle.trim(),
      };

      // Customize data based on target table
      switch (saveTarget) {
        case 'coaching_drills':
          insertData = {
            ...insertData,
            description: saveDescription.trim() || null,
            content: saveContent,
          };
          break;
        case 'coaching_exercises':
          insertData = {
            ...insertData,
            description: saveDescription.trim() || null,
            content: saveContent,
          };
          break;
        case 'coaching_sessions':
          insertData = {
            ...insertData,
            description: saveDescription.trim() || null,
          };
          break;
        case 'coaching_programmes':
          insertData = {
            ...insertData,
            description: saveDescription.trim() || null,
            content: saveContent,
          };
          break;
        case 'coaching_analysis':
          insertData = {
            ...insertData,
            description: saveDescription.trim() || null,
            content: saveContent,
          };
          break;
        case 'coaching_aphorisms':
          insertData = {
            featured_text: saveTitle.trim(),
            body_text: saveContent,
          };
          break;
      }

      const { error } = await supabase
        .from(saveTarget)
        .insert(insertData);

      if (error) throw error;

      toast.success(`Saved to ${SAVE_TARGETS.find(t => t.value === saveTarget)?.label}`);
      setSaveDialogOpen(false);
    } catch (error) {
      console.error('Save error:', error);
      toast.error('Failed to save');
    } finally {
      setIsSaving(false);
    }
  };

  const clearChat = () => {
    setMessages([]);
  };

  return (
    <div className="flex flex-col h-[calc(100vh-200px)] max-h-[800px]">
      <Card className="flex-1 flex flex-col">
        <CardHeader className="flex-shrink-0 flex flex-row items-center justify-between pb-3">
          <CardTitle className="flex items-center gap-2">
            <Bot className="h-5 w-5" />
            Coaching AI Chat
          </CardTitle>
          {messages.length > 0 && (
            <Button variant="ghost" size="sm" onClick={clearChat}>
              <Trash2 className="h-4 w-4 mr-1" />
              Clear
            </Button>
          )}
        </CardHeader>
        <CardContent className="flex-1 flex flex-col overflow-hidden p-0">
          <ScrollArea className="flex-1 px-4" ref={scrollRef}>
            <div className="space-y-4 pb-4">
              {messages.length === 0 && (
                <div className="text-center text-muted-foreground py-12">
                  <Bot className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p className="text-lg font-medium mb-2">Start a conversation</p>
                  <p className="text-sm">Ask about coaching concepts, drills, tactical ideas, or training methodologies.</p>
                  <p className="text-sm mt-1">You can save any AI response to your coaching database.</p>
                </div>
              )}
              {messages.map((message, index) => (
                <div
                  key={index}
                  className={`flex gap-3 ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  {message.role === 'assistant' && (
                    <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                      <Bot className="h-4 w-4 text-primary" />
                    </div>
                  )}
                  <div
                    className={`group relative max-w-[80%] rounded-lg px-4 py-2 ${
                      message.role === 'user'
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-muted'
                    }`}
                  >
                    <div className="whitespace-pre-wrap text-sm">{message.content}</div>
                    {message.role === 'assistant' && message.content && (
                      <Button
                        size="sm"
                        variant="secondary"
                        className="absolute -bottom-8 right-0 opacity-0 group-hover:opacity-100 transition-opacity h-7 text-xs"
                        onClick={() => handleSaveClick(message.content)}
                      >
                        <Save className="h-3 w-3 mr-1" />
                        Save to Database
                      </Button>
                    )}
                  </div>
                  {message.role === 'user' && (
                    <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary flex items-center justify-center">
                      <User className="h-4 w-4 text-primary-foreground" />
                    </div>
                  )}
                </div>
              ))}
              {isLoading && messages[messages.length - 1]?.role === 'user' && (
                <div className="flex gap-3 justify-start">
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                    <Bot className="h-4 w-4 text-primary" />
                  </div>
                  <div className="bg-muted rounded-lg px-4 py-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                  </div>
                </div>
              )}
            </div>
          </ScrollArea>

          <div className="flex-shrink-0 p-4 border-t">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                sendMessage();
              }}
              className="flex gap-2"
            >
              <Input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Ask about coaching concepts, drills, tactics..."
                disabled={isLoading}
                className="flex-1"
              />
              <Button type="submit" disabled={isLoading || !input.trim()}>
                {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              </Button>
            </form>
          </div>
        </CardContent>
      </Card>

      <Dialog open={saveDialogOpen} onOpenChange={setSaveDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Save to Coaching Database</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Save as</Label>
              <Select value={saveTarget} onValueChange={(v) => setSaveTarget(v as SaveTarget)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {SAVE_TARGETS.map((target) => (
                    <SelectItem key={target.value} value={target.value}>
                      {target.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>{saveTarget === 'coaching_aphorisms' ? 'Featured Text' : 'Title'}</Label>
              <Input
                value={saveTitle}
                onChange={(e) => setSaveTitle(e.target.value)}
                placeholder={saveTarget === 'coaching_aphorisms' ? 'Enter featured text...' : 'Enter title...'}
              />
            </div>

            {saveTarget !== 'coaching_aphorisms' && (
              <div className="space-y-2">
                <Label>Description (optional)</Label>
                <Textarea
                  value={saveDescription}
                  onChange={(e) => setSaveDescription(e.target.value)}
                  placeholder="Brief description..."
                  rows={2}
                />
              </div>
            )}

            <div className="space-y-2">
              <Label>{saveTarget === 'coaching_aphorisms' ? 'Body Text' : 'Content'}</Label>
              <Textarea
                value={saveContent}
                onChange={(e) => setSaveContent(e.target.value)}
                rows={10}
                className="font-mono text-sm"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSaveDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={isSaving || !saveTitle.trim()}>
              {isSaving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Plus className="h-4 w-4 mr-2" />}
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
