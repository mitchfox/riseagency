-- Create translations table for managing multi-language content
CREATE TABLE public.translations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  page_name TEXT NOT NULL,
  text_key TEXT NOT NULL,
  english TEXT NOT NULL,
  spanish TEXT,
  portuguese TEXT,
  czech TEXT,
  russian TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(page_name, text_key)
);

-- Enable Row Level Security
ALTER TABLE public.translations ENABLE ROW LEVEL SECURITY;

-- Create policies for staff access
CREATE POLICY "Staff can manage translations" 
ON public.translations 
FOR ALL 
USING (has_role(auth.uid(), 'staff'::app_role) OR has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Staff can view translations" 
ON public.translations 
FOR SELECT 
USING (has_role(auth.uid(), 'staff'::app_role) OR has_role(auth.uid(), 'admin'::app_role));

-- Public can read translations for the website
CREATE POLICY "Anyone can read translations" 
ON public.translations 
FOR SELECT 
USING (true);

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_translations_updated_at
BEFORE UPDATE ON public.translations
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Insert initial translations from the website
INSERT INTO public.translations (page_name, text_key, english, spanish, portuguese, czech, russian) VALUES
-- Landing page
('landing', 'nav_players', 'PLAYERS', 'JUGADORES', 'JOGADORES', 'HRÁČI', 'ИГРОКИ'),
('landing', 'nav_clubs', 'CLUBS', 'CLUBES', 'CLUBES', 'KLUBY', 'КЛУБЫ'),
('landing', 'nav_scouts', 'SCOUTS', 'OJEADORES', 'OLHEIROS', 'SKAUTI', 'СКАУТЫ'),
('landing', 'nav_agents', 'AGENTS', 'AGENTES', 'AGENTES', 'AGENTI', 'АГЕНТЫ'),
('landing', 'nav_home', 'HOME', 'INICIO', 'INÍCIO', 'DOMŮ', 'ГЛАВНАЯ'),
('landing', 'nav_about', 'ABOUT', 'NOSOTROS', 'SOBRE', 'O NÁS', 'О НАС'),

-- Home/Index page
('home', 'hero_title', 'WHERE PLAYERS BECOME STARS.', '¡DONDE LOS JUGADORES SE CONVIERTEN EN ESTRELLAS!', 'ONDE JOGADORES SE TORNAM ESTRELAS.', 'KDE SE HRÁČI STÁVAJÍ HVĚZDAMI.', 'ГДЕ ИГРОКИ СТАНОВЯТСЯ ЗВЁЗДАМИ.'),
('home', 'hero_subtitle', 'An agency built on developing elite footballers', 'Una agencia dedicada a desarrollar futbolistas de élite', 'Uma agência focada em desenvolver futebolistas de elite', 'Agentura zaměřená na rozvoj elitních fotbalistů', 'Агентство, построенное на развитии элитных футболистов'),

-- Header
('header', 'declare_interest', 'Declare Interest In A Star', 'Declarar interés en una estrella', 'Declarar interesse em uma estrela', 'Projevte zájem o hvězdu', 'Заявить интерес к звезде'),
('header', 'request_representation', 'Request Representation', 'Solicitar representación', 'Solicitar representação', 'Žádost o zastoupení', 'Запросить представительство'),
('header', 'work_with_us', 'Work With Us', 'Trabaja con nosotros', 'Trabalhe conosco', 'Pracujte s námi', 'Работайте с нами'),
('header', 'login', 'Login', 'Iniciar sesión', 'Entrar', 'Přihlásit se', 'Войти'),

-- Footer
('footer', 'players_text', 'Ready to take your career to the next level?', '¿Listo para llevar tu carrera al siguiente nivel?', 'Pronto para levar sua carreira ao próximo nível?', 'Jste připraveni posunout svou kariéru na další úroveň?', 'Готовы вывести свою карьеру на новый уровень?'),
('footer', 'clubs_text', 'Looking to discover exceptional talent for your club?', '¿Buscando descubrir talento excepcional para tu club?', 'Procurando descobrir talentos excepcionais para o seu clube?', 'Hledáte výjimečné talenty pro svůj klub?', 'Ищете исключительные таланты для вашего клуба?'),
('footer', 'get_in_touch', 'Get In Touch', 'Contactar', 'Entre em contato', 'Kontaktujte nás', 'Связаться'),
('footer', 'contact_us', 'Contact Us', 'Contáctenos', 'Contate-nos', 'Kontaktujte nás', 'Свяжитесь с нами'),
('footer', 'connect', 'Connect', 'Conectar', 'Conectar', 'Připojit', 'Связаться'),
('footer', 'email', 'Email', 'Correo', 'E-mail', 'E-mail', 'Эл. почта'),
('footer', 'phone', 'Phone', 'Teléfono', 'Telefone', 'Telefon', 'Телефон'),
('footer', 'quick_links', 'Quick Links', 'Enlaces rápidos', 'Links rápidos', 'Rychlé odkazy', 'Быстрые ссылки'),
('footer', 'legal', 'Legal', 'Legal', 'Legal', 'Právní', 'Правовая информация'),
('footer', 'privacy_policy', 'Privacy Policy', 'Política de privacidad', 'Política de Privacidade', 'Zásady ochrany osobních údajů', 'Политика конфиденциальности'),
('footer', 'terms_conditions', 'Terms & Conditions', 'Términos y condiciones', 'Termos e Condições', 'Obchodní podmínky', 'Условия использования'),
('footer', 'all_rights_reserved', 'All rights reserved.', 'Todos los derechos reservados.', 'Todos os direitos reservados.', 'Všechna práva vyhrazena.', 'Все права защищены.'),

-- Stars page
('stars', 'page_title', 'Our Stars', 'Nuestras Estrellas', 'Nossas Estrelas', 'Naše hvězdy', 'Наши звёзды'),
('stars', 'page_subtitle', 'Elite footballers we represent', 'Futbolistas de élite que representamos', 'Futebolistas de elite que representamos', 'Elitní fotbalisté, které zastupujeme', 'Элитные футболисты, которых мы представляем'),
('stars', 'view_profile', 'View Profile', 'Ver perfil', 'Ver perfil', 'Zobrazit profil', 'Просмотр профиля'),

-- Clubs page
('clubs', 'page_title', 'Partner With Us', 'Asóciate con nosotros', 'Seja nosso parceiro', 'Staňte se naším partnerem', 'Станьте нашим партнёром'),
('clubs', 'page_subtitle', 'Discover exceptional talent for your club', 'Descubre talento excepcional para tu club', 'Descubra talentos excepcionais para o seu clube', 'Objevte výjimečné talenty pro svůj klub', 'Откройте для себя исключительные таланты для вашего клуба'),

-- Scouts page
('scouts', 'page_title', 'Join Our Scout Network', 'Únete a nuestra red de ojeadores', 'Junte-se à nossa rede de olheiros', 'Připojte se k naší síti skautů', 'Присоединяйтесь к нашей сети скаутов'),
('scouts', 'page_subtitle', 'Help us identify rising stars around the world', 'Ayúdanos a identificar estrellas emergentes en todo el mundo', 'Ajude-nos a identificar estrelas em ascensão ao redor do mundo', 'Pomozte nám identifikovat vycházející hvězdy po celém světě', 'Помогите нам находить восходящих звёзд по всему миру'),

-- Agents page
('agents', 'page_title', 'Collaborate With Us', 'Colabora con nosotros', 'Colabore conosco', 'Spolupracujte s námi', 'Сотрудничайте с нами'),
('agents', 'page_subtitle', 'Partner on player opportunities and career management', 'Colabora en oportunidades de jugadores y gestión de carreras', 'Parceiro em oportunidades de jogadores e gestão de carreiras', 'Partner pro příležitosti hráčů a řízení kariéry', 'Партнёрство в возможностях игроков и управлении карьерой'),

-- About page
('about', 'page_title', 'About RISE', 'Sobre RISE', 'Sobre a RISE', 'O RISE', 'О RISE'),
('about', 'our_story', 'Our Story', 'Nuestra historia', 'Nossa história', 'Náš příběh', 'Наша история'),
('about', 'our_mission', 'Our Mission', 'Nuestra misión', 'Nossa missão', 'Naše mise', 'Наша миссия'),
('about', 'our_values', 'Our Values', 'Nuestros valores', 'Nossos valores', 'Naše hodnoty', 'Наши ценности'),

-- Common
('common', 'learn_more', 'Learn More', 'Más información', 'Saiba mais', 'Zjistit více', 'Узнать больше'),
('common', 'submit', 'Submit', 'Enviar', 'Enviar', 'Odeslat', 'Отправить'),
('common', 'close', 'Close', 'Cerrar', 'Fechar', 'Zavřít', 'Закрыть'),
('common', 'loading', 'Loading...', 'Cargando...', 'Carregando...', 'Načítání...', 'Загрузка...'),
('common', 'error', 'Error', 'Error', 'Erro', 'Chyba', 'Ошибка'),
('common', 'success', 'Success', 'Éxito', 'Sucesso', 'Úspěch', 'Успех'),
('common', 'cancel', 'Cancel', 'Cancelar', 'Cancelar', 'Zrušit', 'Отмена'),
('common', 'save', 'Save', 'Guardar', 'Salvar', 'Uložit', 'Сохранить'),
('common', 'delete', 'Delete', 'Eliminar', 'Excluir', 'Smazat', 'Удалить'),
('common', 'edit', 'Edit', 'Editar', 'Editar', 'Upravit', 'Редактировать'),
('common', 'search', 'Search', 'Buscar', 'Pesquisar', 'Hledat', 'Поиск'),
('common', 'filter', 'Filter', 'Filtrar', 'Filtrar', 'Filtrovat', 'Фильтр'),
('common', 'back', 'Back', 'Volver', 'Voltar', 'Zpět', 'Назад'),
('common', 'next', 'Next', 'Siguiente', 'Próximo', 'Další', 'Далее'),
('common', 'previous', 'Previous', 'Anterior', 'Anterior', 'Předchozí', 'Назад'),
('common', 'name', 'Name', 'Nombre', 'Nome', 'Jméno', 'Имя'),
('common', 'email_label', 'Email', 'Correo electrónico', 'E-mail', 'E-mail', 'Эл. почта'),
('common', 'message', 'Message', 'Mensaje', 'Mensagem', 'Zpráva', 'Сообщение'),
('common', 'send', 'Send', 'Enviar', 'Enviar', 'Odeslat', 'Отправить');