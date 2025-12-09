import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Badge } from '@/components/ui/badge';
import { Send, Bot, User, Save, Loader2, Plus, Trash2, Settings, ChevronDown } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { MarkdownContent } from '@/utils/markdownRenderer';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

type SaveTarget = 'coaching_drills' | 'coaching_exercises' | 'coaching_sessions' | 'coaching_programmes' | 'coaching_analysis_concept' | 'coaching_aphorisms';

const SAVE_TARGETS: { value: SaveTarget; label: string }[] = [
  { value: 'coaching_analysis_concept', label: 'Concept' },
  { value: 'coaching_drills', label: 'Drill' },
  { value: 'coaching_exercises', label: 'Exercise' },
  { value: 'coaching_sessions', label: 'Session' },
  { value: 'coaching_programmes', label: 'Programme' },
  { value: 'coaching_aphorisms', label: 'Aphorism' },
];

const WRITING_STYLES = [
  { value: 'professional', label: 'Professional' },
  { value: 'casual', label: 'Casual & Friendly' },
  { value: 'technical', label: 'Technical & Detailed' },
  { value: 'concise', label: 'Concise & Direct' },
];

const PERSONALITY_TYPES = [
  { value: 'coach', label: 'Experienced Coach' },
  { value: 'analyst', label: 'Tactical Analyst' },
  { value: 'mentor', label: 'Player Mentor' },
  { value: 'educator', label: 'Football Educator' },
];

const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ai-coaching-chat`;

const SETTINGS_KEY = 'coaching-ai-settings';
const CHAT_SESSION_KEY = 'coaching-ai-current-session';

export function CoachingAIChat() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [saveDialogOpen, setSaveDialogOpen] = useState(false);
  const [selectedMessage, setSelectedMessage] = useState<string>('');
  const [saveTarget, setSaveTarget] = useState<SaveTarget>('coaching_analysis_concept');
  const [saveTitle, setSaveTitle] = useState('');
  const [saveDescription, setSaveDescription] = useState('');
  const [saveContent, setSaveContent] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [writingStyle, setWritingStyle] = useState('concise');
  const [personality, setPersonality] = useState('coach');
  const [customInstructions, setCustomInstructions] = useState('');
  const [bannedPhrases, setBannedPhrases] = useState<string[]>(["It's about"]);
  const [newBannedPhrase, setNewBannedPhrase] = useState('');
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Load saved settings from localStorage
  useEffect(() => {
    const savedSettings = localStorage.getItem(SETTINGS_KEY);
    if (savedSettings) {
      try {
        const parsed = JSON.parse(savedSettings);
        if (parsed.writingStyle) setWritingStyle(parsed.writingStyle);
        if (parsed.personality) setPersonality(parsed.personality);
        if (parsed.customInstructions) setCustomInstructions(parsed.customInstructions);
        if (parsed.bannedPhrases) setBannedPhrases(parsed.bannedPhrases);
      } catch (e) {
        console.error('Failed to parse saved settings:', e);
      }
    }
  }, []);

  // Load most recent chat session on mount
  useEffect(() => {
    const loadRecentSession = async () => {
      try {
        const { data, error } = await supabase
          .from('coaching_chat_sessions')
          .select('id, messages')
          .order('updated_at', { ascending: false })
          .limit(1)
          .maybeSingle();
        
        if (!error && data && data.messages) {
          const loadedMessages = data.messages as unknown as Message[];
          if (Array.isArray(loadedMessages) && loadedMessages.length > 0) {
            setMessages(loadedMessages);
            setCurrentSessionId(data.id);
          }
        }
      } catch (e) {
        console.error('Failed to load chat session:', e);
      }
    };
    
    loadRecentSession();
  }, []);

  // Save settings to localStorage when they change
  useEffect(() => {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify({ writingStyle, personality, customInstructions }));
  }, [writingStyle, personality, customInstructions]);

  // Auto-scroll to bottom
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  // Save chat session to database when messages change
  useEffect(() => {
    if (messages.length === 0) return;
    
    const saveSession = async () => {
      try {
        const title = messages[0]?.content?.slice(0, 50) || 'New Chat';
        
        if (currentSessionId) {
          await supabase
            .from('coaching_chat_sessions')
            .update({ messages: JSON.parse(JSON.stringify(messages)), title, updated_at: new Date().toISOString() })
            .eq('id', currentSessionId);
        } else {
          const { data, error } = await supabase
            .from('coaching_chat_sessions')
            .insert([{ messages: JSON.parse(JSON.stringify(messages)), title }])
            .select('id')
            .single();
          
          if (!error && data) {
            setCurrentSessionId(data.id);
          }
        }
      } catch (e) {
        console.error('Failed to save chat session:', e);
      }
    };

    const debounce = setTimeout(saveSession, 1000);
    return () => clearTimeout(debounce);
  }, [messages, currentSessionId]);

  const buildSystemContext = () => {
    const styleDesc = WRITING_STYLES.find(s => s.value === writingStyle)?.label || 'Professional';
    const personalityDesc = PERSONALITY_TYPES.find(p => p.value === personality)?.label || 'Experienced Coach';
    
    let context = `Writing style: ${styleDesc}. Personality: ${personalityDesc}.`;
    if (customInstructions.trim()) {
      context += ` Additional instructions: ${customInstructions}`;
    }
    return context;
  };

  const sendMessage = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage: Message = { role: 'user', content: input.trim() };
    const newMessages = [...messages, userMessage];
    setMessages(newMessages);
    setInput('');
    setIsLoading(true);

    let assistantContent = '';
    const systemContext = buildSystemContext();

    try {
      const response = await fetch(CHAT_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({ 
          messages: newMessages,
          settings: { 
            writingStyle, 
            personality, 
            customInstructions: customInstructions.trim(),
            bannedPhrases 
          }
        }),
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
      let tableName: string;
      let insertData: Record<string, unknown> = {
        title: saveTitle.trim(),
      };

      // Customize data based on target table
      switch (saveTarget) {
        case 'coaching_analysis_concept':
          tableName = 'coaching_analysis';
          insertData = {
            title: saveTitle.trim(),
            description: saveDescription.trim() || null,
            content: saveContent,
            analysis_type: 'concept',
          };
          break;
        case 'coaching_drills':
          tableName = 'coaching_drills';
          insertData = {
            ...insertData,
            description: saveDescription.trim() || null,
            content: saveContent,
          };
          break;
        case 'coaching_exercises':
          tableName = 'coaching_exercises';
          insertData = {
            ...insertData,
            description: saveDescription.trim() || null,
            content: saveContent,
          };
          break;
        case 'coaching_sessions':
          tableName = 'coaching_sessions';
          insertData = {
            ...insertData,
            description: saveDescription.trim() || null,
          };
          break;
        case 'coaching_programmes':
          tableName = 'coaching_programmes';
          insertData = {
            ...insertData,
            description: saveDescription.trim() || null,
            content: saveContent,
          };
          break;
        case 'coaching_aphorisms':
          tableName = 'coaching_aphorisms';
          insertData = {
            featured_text: saveTitle.trim(),
            body_text: saveContent,
          };
          break;
        default:
          throw new Error('Invalid save target');
      }

      const { error } = await supabase
        .from(tableName as 'coaching_drills')
        .insert(insertData as any);

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
    setCurrentSessionId(null);
  };

  return (
    <div className="flex flex-col h-[calc(100vh-180px)] w-full">
      {/* Settings Panel */}
      <Collapsible open={settingsOpen} onOpenChange={setSettingsOpen} className="mb-3">
        <CollapsibleTrigger asChild>
          <Button variant="outline" className="w-full justify-between">
            <span className="flex items-center gap-2">
              <Settings className="h-4 w-4" />
              AI Settings
            </span>
            <ChevronDown className={`h-4 w-4 transition-transform ${settingsOpen ? 'rotate-180' : ''}`} />
          </Button>
        </CollapsibleTrigger>
        <CollapsibleContent className="pt-3">
          <Card>
            <CardContent className="p-4 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Writing Style</Label>
                  <Select value={writingStyle} onValueChange={setWritingStyle}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {WRITING_STYLES.map((style) => (
                        <SelectItem key={style.value} value={style.value}>
                          {style.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Personality</Label>
                  <Select value={personality} onValueChange={setPersonality}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {PERSONALITY_TYPES.map((type) => (
                        <SelectItem key={type.value} value={type.value}>
                          {type.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2">
                <Label>Custom Instructions (optional)</Label>
                <Textarea
                  value={customInstructions}
                  onChange={(e) => setCustomInstructions(e.target.value)}
                  placeholder="Add any specific instructions for how the AI should respond..."
                  rows={2}
                  className="resize-none"
                />
              </div>
              <div className="space-y-2">
                <Label>Banned Words/Phrases</Label>
                <div className="flex flex-wrap gap-2 mb-2">
                  {bannedPhrases.map((phrase, idx) => (
                    <Badge key={idx} variant="secondary" className="flex items-center gap-1">
                      {phrase}
                      <button 
                        onClick={() => setBannedPhrases(prev => prev.filter((_, i) => i !== idx))}
                        className="ml-1 hover:text-destructive"
                      >
                        ×
                      </button>
                    </Badge>
                  ))}
                </div>
                <div className="flex gap-2">
                  <Input
                    value={newBannedPhrase}
                    onChange={(e) => setNewBannedPhrase(e.target.value)}
                    placeholder="Add phrase to ban..."
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && newBannedPhrase.trim()) {
                        e.preventDefault();
                        setBannedPhrases(prev => [...prev, newBannedPhrase.trim()]);
                        setNewBannedPhrase('');
                      }
                    }}
                  />
                  <Button 
                    type="button"
                    variant="outline" 
                    size="sm"
                    onClick={() => {
                      if (newBannedPhrase.trim()) {
                        setBannedPhrases(prev => [...prev, newBannedPhrase.trim()]);
                        setNewBannedPhrase('');
                      }
                    }}
                  >
                    Add
                  </Button>
                </div>
              </div>
              <Button 
                variant="secondary" 
                className="w-full"
                onClick={() => {
                  localStorage.setItem(SETTINGS_KEY, JSON.stringify({ writingStyle, personality, customInstructions, bannedPhrases }));
                  toast.success('Settings saved');
                  setSettingsOpen(false);
                }}
              >
                Save Settings
              </Button>
            </CardContent>
          </Card>
        </CollapsibleContent>
      </Collapsible>

      {/* Chat Area */}
      <Card className="flex-1 flex flex-col min-h-0">
        <CardHeader className="flex-shrink-0 flex flex-row items-center justify-between py-3 px-4">
          <CardTitle className="flex items-center gap-2 text-base">
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
        <CardContent className="flex-1 flex flex-col overflow-hidden p-0 min-h-0">
          <ScrollArea className="flex-1 px-3 md:px-4" ref={scrollRef}>
            <div className="space-y-6 py-4">
              {messages.length === 0 && (
                <div className="text-center text-muted-foreground py-8 md:py-12">
                  <Bot className="h-10 w-10 md:h-12 md:w-12 mx-auto mb-4 opacity-50" />
                  <p className="text-base md:text-lg font-medium mb-2">Start a conversation</p>
                  <p className="text-sm px-4">Ask about coaching concepts, drills, tactical ideas, or training methodologies.</p>
                  <p className="text-sm mt-1">Save any AI response to your coaching database.</p>
                </div>
              )}
              {messages.map((message, index) => (
                <div
                  key={index}
                  className={`flex gap-2 md:gap-3 ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  {message.role === 'assistant' && (
                    <div className="flex-shrink-0 w-7 h-7 md:w-8 md:h-8 rounded-full bg-primary/10 flex items-center justify-center">
                      <Bot className="h-4 w-4 text-primary" />
                    </div>
                  )}
                  <div
                    className={`group relative max-w-[90%] md:max-w-[85%] rounded-lg px-3 py-2 md:px-4 md:py-3 ${
                      message.role === 'user'
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-muted'
                    }`}
                  >
                    <div className="text-sm">
                      {message.role === 'assistant' ? (
                        <MarkdownContent content={message.content} />
                      ) : (
                        <p className="whitespace-pre-wrap">{message.content}</p>
                      )}
                    </div>
                    {message.role === 'assistant' && message.content && (
                      <Button
                        size="sm"
                        variant="secondary"
                        className="mt-2 h-7 text-xs w-full sm:w-auto"
                        onClick={() => handleSaveClick(message.content)}
                      >
                        <Save className="h-3 w-3 mr-1" />
                        Save to Database
                      </Button>
                    )}
                  </div>
                  {message.role === 'user' && (
                    <div className="flex-shrink-0 w-7 h-7 md:w-8 md:h-8 rounded-full bg-primary flex items-center justify-center">
                      <User className="h-4 w-4 text-primary-foreground" />
                    </div>
                  )}
                </div>
              ))}
              {isLoading && messages[messages.length - 1]?.role === 'user' && (
                <div className="flex gap-2 md:gap-3 justify-start">
                  <div className="flex-shrink-0 w-7 h-7 md:w-8 md:h-8 rounded-full bg-primary/10 flex items-center justify-center">
                    <Bot className="h-4 w-4 text-primary" />
                  </div>
                  <div className="bg-muted rounded-lg px-3 py-2 md:px-4 md:py-3">
                    <Loader2 className="h-4 w-4 animate-spin" />
                  </div>
                </div>
              )}
            </div>
          </ScrollArea>

          <div className="flex-shrink-0 p-3 md:p-4 border-t">
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
                placeholder="Ask about coaching concepts..."
                disabled={isLoading}
                className="flex-1"
              />
              <Button type="submit" disabled={isLoading || !input.trim()} size="icon" className="shrink-0">
                {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              </Button>
            </form>
          </div>
        </CardContent>
      </Card>

      <Dialog open={saveDialogOpen} onOpenChange={setSaveDialogOpen}>
        <DialogContent className="w-full max-w-4xl max-h-[90vh] overflow-y-auto sm:mx-4">
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
              {saveTarget === 'coaching_analysis_concept' && (
                <p className="text-xs text-muted-foreground">Concepts can be assigned to players from the Coaching Database.</p>
              )}
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
                rows={8}
                className="font-mono text-sm"
              />
            </div>
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
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
