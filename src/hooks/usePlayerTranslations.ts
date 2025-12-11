import { useState, useEffect, useMemo, useCallback } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { supabase } from '@/integrations/supabase/client';

type LanguageCode = 'en' | 'es' | 'pt' | 'fr' | 'de' | 'it' | 'pl' | 'cs' | 'ru' | 'tr';

interface TranslatedPlayerContent {
  bio: string;
  position: string;
  strengths: string[];
}

interface UsePlayerTranslationsOptions {
  bio: string;
  position: string;
  playerId?: string;
  strengths?: string[];
}

const positionTranslations: Record<string, Record<string, string>> = {
  'Striker': {
    es: 'Delantero',
    pt: 'Atacante',
    fr: 'Attaquant',
    de: 'Stürmer',
    it: 'Attaccante',
    pl: 'Napastnik',
    cs: 'Útočník',
    ru: 'Нападающий',
    tr: 'Forvet',
  },
  'ST': {
    es: 'DEL',
    pt: 'ATA',
    fr: 'ATT',
    de: 'ST',
    it: 'ATT',
    pl: 'NAP',
    cs: 'ÚT',
    ru: 'НАП',
    tr: 'FOR',
  },
  'CF': {
    es: 'DC',
    pt: 'CA',
    fr: 'AC',
    de: 'MS',
    it: 'AC',
    pl: 'SC',
    cs: 'SÚ',
    ru: 'ЦН',
    tr: 'SF',
  },
  'Forward': {
    es: 'Delantero',
    pt: 'Atacante',
    fr: 'Attaquant',
    de: 'Stürmer',
    it: 'Attaccante',
    pl: 'Napastnik',
    cs: 'Útočník',
    ru: 'Нападающий',
    tr: 'Forvet',
  },
  'FW': {
    es: 'DEL',
    pt: 'ATA',
    fr: 'ATT',
    de: 'ST',
    it: 'ATT',
    pl: 'NAP',
    cs: 'ÚT',
    ru: 'НАП',
    tr: 'FOR',
  },
  'Midfielder': {
    es: 'Centrocampista',
    pt: 'Meio-campista',
    fr: 'Milieu de terrain',
    de: 'Mittelfeldspieler',
    it: 'Centrocampista',
    pl: 'Pomocnik',
    cs: 'Záložník',
    ru: 'Полузащитник',
    tr: 'Orta saha',
  },
  'MF': {
    es: 'MC',
    pt: 'MC',
    fr: 'MIL',
    de: 'MF',
    it: 'CC',
    pl: 'POM',
    cs: 'ZÁL',
    ru: 'ПЗ',
    tr: 'OS',
  },
  'CM': {
    es: 'MC',
    pt: 'MC',
    fr: 'MC',
    de: 'ZM',
    it: 'CC',
    pl: 'ŚP',
    cs: 'SZ',
    ru: 'ЦП',
    tr: 'MOS',
  },
  'Defender': {
    es: 'Defensor',
    pt: 'Defensor',
    fr: 'Défenseur',
    de: 'Verteidiger',
    it: 'Difensore',
    pl: 'Obrońca',
    cs: 'Obránce',
    ru: 'Защитник',
    tr: 'Defans',
  },
  'DF': {
    es: 'DEF',
    pt: 'DEF',
    fr: 'DÉF',
    de: 'AV',
    it: 'DIF',
    pl: 'OBR',
    cs: 'OBR',
    ru: 'ЗАЩ',
    tr: 'DEF',
  },
  'CB': {
    es: 'DFC',
    pt: 'ZAG',
    fr: 'DC',
    de: 'IV',
    it: 'DC',
    pl: 'ŚO',
    cs: 'SO',
    ru: 'ЦЗ',
    tr: 'STP',
  },
  'Goalkeeper': {
    es: 'Portero',
    pt: 'Goleiro',
    fr: 'Gardien de but',
    de: 'Torwart',
    it: 'Portiere',
    pl: 'Bramkarz',
    cs: 'Brankář',
    ru: 'Вратарь',
    tr: 'Kaleci',
  },
  'GK': {
    es: 'POR',
    pt: 'GOL',
    fr: 'GAR',
    de: 'TW',
    it: 'POR',
    pl: 'BR',
    cs: 'BRA',
    ru: 'ВР',
    tr: 'KAL',
  },
  'Winger': {
    es: 'Extremo',
    pt: 'Ponta',
    fr: 'Ailier',
    de: 'Flügelspieler',
    it: 'Ala',
    pl: 'Skrzydłowy',
    cs: 'Křídelní hráč',
    ru: 'Вингер',
    tr: 'Kanat',
  },
  'LW': {
    es: 'EI',
    pt: 'PE',
    fr: 'AG',
    de: 'LA',
    it: 'AS',
    pl: 'LS',
    cs: 'LK',
    ru: 'ЛВ',
    tr: 'SK',
  },
  'RW': {
    es: 'ED',
    pt: 'PD',
    fr: 'AD',
    de: 'RA',
    it: 'AD',
    pl: 'PS',
    cs: 'PK',
    ru: 'ПВ',
    tr: 'SAK',
  },
  'Centre-Back': {
    es: 'Defensa central',
    pt: 'Zagueiro',
    fr: 'Défenseur central',
    de: 'Innenverteidiger',
    it: 'Difensore centrale',
    pl: 'Środkowy obrońca',
    cs: 'Střední obránce',
    ru: 'Центральный защитник',
    tr: 'Stoper',
  },
  'Full-Back': {
    es: 'Lateral',
    pt: 'Lateral',
    fr: 'Arrière latéral',
    de: 'Außenverteidiger',
    it: 'Terzino',
    pl: 'Boczny obrońca',
    cs: 'Krajní obránce',
    ru: 'Крайний защитник',
    tr: 'Bek',
  },
  'LB': {
    es: 'LI',
    pt: 'LE',
    fr: 'AG',
    de: 'LV',
    it: 'TS',
    pl: 'LO',
    cs: 'LO',
    ru: 'ЛЗ',
    tr: 'SB',
  },
  'RB': {
    es: 'LD',
    pt: 'LD',
    fr: 'AD',
    de: 'RV',
    it: 'TD',
    pl: 'PO',
    cs: 'PO',
    ru: 'ПЗ',
    tr: 'SAB',
  },
  'Attacking Midfielder': {
    es: 'Mediapunta',
    pt: 'Meia atacante',
    fr: 'Milieu offensif',
    de: 'Offensiver Mittelfeldspieler',
    it: 'Trequartista',
    pl: 'Ofensywny pomocnik',
    cs: 'Útočný záložník',
    ru: 'Атакующий полузащитник',
    tr: 'Ofansif orta saha',
  },
  'CAM': {
    es: 'MCO',
    pt: 'MEI',
    fr: 'MOC',
    de: 'ZOM',
    it: 'TRQ',
    pl: 'OP',
    cs: 'ÚZ',
    ru: 'АПЗ',
    tr: 'OOS',
  },
  'AM': {
    es: 'MCO',
    pt: 'MEI',
    fr: 'MOC',
    de: 'ZOM',
    it: 'TRQ',
    pl: 'OP',
    cs: 'ÚZ',
    ru: 'АПЗ',
    tr: 'OOS',
  },
  'Defensive Midfielder': {
    es: 'Pivote',
    pt: 'Volante',
    fr: 'Milieu défensif',
    de: 'Defensiver Mittelfeldspieler',
    it: 'Mediano',
    pl: 'Defensywny pomocnik',
    cs: 'Defenzivní záložník',
    ru: 'Опорный полузащитник',
    tr: 'Defansif orta saha',
  },
  'CDM': {
    es: 'MCD',
    pt: 'VOL',
    fr: 'MDC',
    de: 'ZDM',
    it: 'MED',
    pl: 'DP',
    cs: 'DZ',
    ru: 'ОПЗ',
    tr: 'DOS',
  },
  'DM': {
    es: 'MCD',
    pt: 'VOL',
    fr: 'MDC',
    de: 'ZDM',
    it: 'MED',
    pl: 'DP',
    cs: 'DZ',
    ru: 'ОПЗ',
    tr: 'DOS',
  },
};

// Country name translations
export const countryTranslations: Record<string, Record<string, string>> = {
  'England': { es: 'Inglaterra', pt: 'Inglaterra', fr: 'Angleterre', de: 'England', it: 'Inghilterra', pl: 'Anglia', cs: 'Anglie', ru: 'Англия', tr: 'İngiltere' },
  'Ireland': { es: 'Irlanda', pt: 'Irlanda', fr: 'Irlande', de: 'Irland', it: 'Irlanda', pl: 'Irlandia', cs: 'Irsko', ru: 'Ирландия', tr: 'İrlanda' },
  'Spain': { es: 'España', pt: 'Espanha', fr: 'Espagne', de: 'Spanien', it: 'Spagna', pl: 'Hiszpania', cs: 'Španělsko', ru: 'Испания', tr: 'İspanya' },
  'France': { es: 'Francia', pt: 'França', fr: 'France', de: 'Frankreich', it: 'Francia', pl: 'Francja', cs: 'Francie', ru: 'Франция', tr: 'Fransa' },
  'Germany': { es: 'Alemania', pt: 'Alemanha', fr: 'Allemagne', de: 'Deutschland', it: 'Germania', pl: 'Niemcy', cs: 'Německo', ru: 'Германия', tr: 'Almanya' },
  'Italy': { es: 'Italia', pt: 'Itália', fr: 'Italie', de: 'Italien', it: 'Italia', pl: 'Włochy', cs: 'Itálie', ru: 'Италия', tr: 'İtalya' },
  'Portugal': { es: 'Portugal', pt: 'Portugal', fr: 'Portugal', de: 'Portugal', it: 'Portogallo', pl: 'Portugalia', cs: 'Portugalsko', ru: 'Португалия', tr: 'Portekiz' },
  'Netherlands': { es: 'Países Bajos', pt: 'Países Baixos', fr: 'Pays-Bas', de: 'Niederlande', it: 'Paesi Bassi', pl: 'Holandia', cs: 'Nizozemsko', ru: 'Нидерланды', tr: 'Hollanda' },
  'Belgium': { es: 'Bélgica', pt: 'Bélgica', fr: 'Belgique', de: 'Belgien', it: 'Belgio', pl: 'Belgia', cs: 'Belgie', ru: 'Бельгия', tr: 'Belçika' },
  'Brazil': { es: 'Brasil', pt: 'Brasil', fr: 'Brésil', de: 'Brasilien', it: 'Brasile', pl: 'Brazylia', cs: 'Brazílie', ru: 'Бразилия', tr: 'Brezilya' },
  'Argentina': { es: 'Argentina', pt: 'Argentina', fr: 'Argentine', de: 'Argentinien', it: 'Argentina', pl: 'Argentyna', cs: 'Argentina', ru: 'Аргентина', tr: 'Arjantin' },
  'Scotland': { es: 'Escocia', pt: 'Escócia', fr: 'Écosse', de: 'Schottland', it: 'Scozia', pl: 'Szkocja', cs: 'Skotsko', ru: 'Шотландия', tr: 'İskoçya' },
  'Wales': { es: 'Gales', pt: 'País de Gales', fr: 'Pays de Galles', de: 'Wales', it: 'Galles', pl: 'Walia', cs: 'Wales', ru: 'Уэльс', tr: 'Galler' },
  'Poland': { es: 'Polonia', pt: 'Polônia', fr: 'Pologne', de: 'Polen', it: 'Polonia', pl: 'Polska', cs: 'Polsko', ru: 'Польша', tr: 'Polonya' },
  'Czech Republic': { es: 'República Checa', pt: 'República Tcheca', fr: 'République tchèque', de: 'Tschechien', it: 'Repubblica Ceca', pl: 'Czechy', cs: 'Česká republika', ru: 'Чехия', tr: 'Çek Cumhuriyeti' },
  'Russia': { es: 'Rusia', pt: 'Rússia', fr: 'Russie', de: 'Russland', it: 'Russia', pl: 'Rosja', cs: 'Rusko', ru: 'Россия', tr: 'Rusya' },
  'Turkey': { es: 'Turquía', pt: 'Turquia', fr: 'Turquie', de: 'Türkei', it: 'Turchia', pl: 'Turcja', cs: 'Turecko', ru: 'Турция', tr: 'Türkiye' },
  'Nigeria': { es: 'Nigeria', pt: 'Nigéria', fr: 'Nigéria', de: 'Nigeria', it: 'Nigeria', pl: 'Nigeria', cs: 'Nigérie', ru: 'Нигерия', tr: 'Nijerya' },
  'Ghana': { es: 'Ghana', pt: 'Gana', fr: 'Ghana', de: 'Ghana', it: 'Ghana', pl: 'Ghana', cs: 'Ghana', ru: 'Гана', tr: 'Gana' },
  'USA': { es: 'Estados Unidos', pt: 'Estados Unidos', fr: 'États-Unis', de: 'USA', it: 'Stati Uniti', pl: 'USA', cs: 'USA', ru: 'США', tr: 'ABD' },
  'United States': { es: 'Estados Unidos', pt: 'Estados Unidos', fr: 'États-Unis', de: 'Vereinigte Staaten', it: 'Stati Uniti', pl: 'Stany Zjednoczone', cs: 'Spojené státy', ru: 'Соединённые Штаты', tr: 'Amerika Birleşik Devletleri' },
  'Canada': { es: 'Canadá', pt: 'Canadá', fr: 'Canada', de: 'Kanada', it: 'Canada', pl: 'Kanada', cs: 'Kanada', ru: 'Канада', tr: 'Kanada' },
  'Mexico': { es: 'México', pt: 'México', fr: 'Mexique', de: 'Mexiko', it: 'Messico', pl: 'Meksyk', cs: 'Mexiko', ru: 'Мексика', tr: 'Meksika' },
  'Japan': { es: 'Japón', pt: 'Japão', fr: 'Japon', de: 'Japan', it: 'Giappone', pl: 'Japonia', cs: 'Japonsko', ru: 'Япония', tr: 'Japonya' },
  'South Korea': { es: 'Corea del Sur', pt: 'Coreia do Sul', fr: 'Corée du Sud', de: 'Südkorea', it: 'Corea del Sud', pl: 'Korea Południowa', cs: 'Jižní Korea', ru: 'Южная Корея', tr: 'Güney Kore' },
  'Australia': { es: 'Australia', pt: 'Austrália', fr: 'Australie', de: 'Australien', it: 'Australia', pl: 'Australia', cs: 'Austrálie', ru: 'Австралия', tr: 'Avustralya' },
  'Sweden': { es: 'Suecia', pt: 'Suécia', fr: 'Suède', de: 'Schweden', it: 'Svezia', pl: 'Szwecja', cs: 'Švédsko', ru: 'Швеция', tr: 'İsveç' },
  'Norway': { es: 'Noruega', pt: 'Noruega', fr: 'Norvège', de: 'Norwegen', it: 'Norvegia', pl: 'Norwegia', cs: 'Norsko', ru: 'Норвегия', tr: 'Norveç' },
  'Denmark': { es: 'Dinamarca', pt: 'Dinamarca', fr: 'Danemark', de: 'Dänemark', it: 'Danimarca', pl: 'Dania', cs: 'Dánsko', ru: 'Дания', tr: 'Danimarka' },
  'Austria': { es: 'Austria', pt: 'Áustria', fr: 'Autriche', de: 'Österreich', it: 'Austria', pl: 'Austria', cs: 'Rakousko', ru: 'Австрия', tr: 'Avusturya' },
  'Switzerland': { es: 'Suiza', pt: 'Suíça', fr: 'Suisse', de: 'Schweiz', it: 'Svizzera', pl: 'Szwajcaria', cs: 'Švýcarsko', ru: 'Швейцария', tr: 'İsviçre' },
  'Croatia': { es: 'Croacia', pt: 'Croácia', fr: 'Croatie', de: 'Kroatien', it: 'Croazia', pl: 'Chorwacja', cs: 'Chorvatsko', ru: 'Хорватия', tr: 'Hırvatistan' },
  'Serbia': { es: 'Serbia', pt: 'Sérvia', fr: 'Serbie', de: 'Serbien', it: 'Serbia', pl: 'Serbia', cs: 'Srbsko', ru: 'Сербия', tr: 'Sırbistan' },
  'Ukraine': { es: 'Ucrania', pt: 'Ucrânia', fr: 'Ukraine', de: 'Ukraine', it: 'Ucraina', pl: 'Ukraina', cs: 'Ukrajina', ru: 'Украина', tr: 'Ukrayna' },
  'Greece': { es: 'Grecia', pt: 'Grécia', fr: 'Grèce', de: 'Griechenland', it: 'Grecia', pl: 'Grecja', cs: 'Řecko', ru: 'Греция', tr: 'Yunanistan' },
  'Morocco': { es: 'Marruecos', pt: 'Marrocos', fr: 'Maroc', de: 'Marokko', it: 'Marocco', pl: 'Maroko', cs: 'Maroko', ru: 'Марокко', tr: 'Fas' },
  'Egypt': { es: 'Egipto', pt: 'Egito', fr: 'Égypte', de: 'Ägypten', it: 'Egitto', pl: 'Egipt', cs: 'Egypt', ru: 'Египет', tr: 'Mısır' },
  'Senegal': { es: 'Senegal', pt: 'Senegal', fr: 'Sénégal', de: 'Senegal', it: 'Senegal', pl: 'Senegal', cs: 'Senegal', ru: 'Сенегал', tr: 'Senegal' },
  'Cameroon': { es: 'Camerún', pt: 'Camarões', fr: 'Cameroun', de: 'Kamerun', it: 'Camerun', pl: 'Kamerun', cs: 'Kamerun', ru: 'Камерун', tr: 'Kamerun' },
  'Ivory Coast': { es: 'Costa de Marfil', pt: 'Costa do Marfim', fr: 'Côte d\'Ivoire', de: 'Elfenbeinküste', it: 'Costa d\'Avorio', pl: 'Wybrzeże Kości Słoniowej', cs: 'Pobřeží slonoviny', ru: 'Кот-д\'Ивуар', tr: 'Fildişi Sahili' },
  'Colombia': { es: 'Colombia', pt: 'Colômbia', fr: 'Colombie', de: 'Kolumbien', it: 'Colombia', pl: 'Kolumbia', cs: 'Kolumbie', ru: 'Колумбия', tr: 'Kolombiya' },
  'Chile': { es: 'Chile', pt: 'Chile', fr: 'Chili', de: 'Chile', it: 'Cile', pl: 'Chile', cs: 'Chile', ru: 'Чили', tr: 'Şili' },
  'Uruguay': { es: 'Uruguay', pt: 'Uruguai', fr: 'Uruguay', de: 'Uruguay', it: 'Uruguay', pl: 'Urugwaj', cs: 'Uruguay', ru: 'Уругвай', tr: 'Uruguay' },
  'Ecuador': { es: 'Ecuador', pt: 'Equador', fr: 'Équateur', de: 'Ecuador', it: 'Ecuador', pl: 'Ekwador', cs: 'Ekvádor', ru: 'Эквадор', tr: 'Ekvador' },
  'Paraguay': { es: 'Paraguay', pt: 'Paraguai', fr: 'Paraguay', de: 'Paraguay', it: 'Paraguay', pl: 'Paragwaj', cs: 'Paraguay', ru: 'Парагвай', tr: 'Paraguay' },
  'Peru': { es: 'Perú', pt: 'Peru', fr: 'Pérou', de: 'Peru', it: 'Perù', pl: 'Peru', cs: 'Peru', ru: 'Перу', tr: 'Peru' },
  'Venezuela': { es: 'Venezuela', pt: 'Venezuela', fr: 'Venezuela', de: 'Venezuela', it: 'Venezuela', pl: 'Wenezuela', cs: 'Venezuela', ru: 'Венесуэла', tr: 'Venezuela' },
  'Jamaica': { es: 'Jamaica', pt: 'Jamaica', fr: 'Jamaïque', de: 'Jamaika', it: 'Giamaica', pl: 'Jamajka', cs: 'Jamajka', ru: 'Ямайка', tr: 'Jamaika' },
  'Northern Ireland': { es: 'Irlanda del Norte', pt: 'Irlanda do Norte', fr: 'Irlande du Nord', de: 'Nordirland', it: 'Irlanda del Nord', pl: 'Irlandia Północna', cs: 'Severní Irsko', ru: 'Северная Ирландия', tr: 'Kuzey İrlanda' },
};

// Season stat header translations
export const seasonStatTranslations: Record<string, Record<string, string>> = {
  'Minutes': { es: 'Minutos', pt: 'Minutos', fr: 'Minutes', de: 'Minuten', it: 'Minuti', pl: 'Minuty', cs: 'Minuty', ru: 'Минуты', tr: 'Dakika' },
  'Goals': { es: 'Goles', pt: 'Gols', fr: 'Buts', de: 'Tore', it: 'Gol', pl: 'Gole', cs: 'Góly', ru: 'Голы', tr: 'Goller' },
  'Assists': { es: 'Asistencias', pt: 'Assistências', fr: 'Passes décisives', de: 'Assists', it: 'Assist', pl: 'Asysty', cs: 'Asistence', ru: 'Ассисты', tr: 'Asistler' },
  'Matches': { es: 'Partidos', pt: 'Partidas', fr: 'Matchs', de: 'Spiele', it: 'Partite', pl: 'Mecze', cs: 'Zápasy', ru: 'Матчи', tr: 'Maçlar' },
  'Clean Sheets': { es: 'Porterías imbatidas', pt: 'Jogos sem sofrer gol', fr: 'Clean sheets', de: 'Zu-Null-Spiele', it: 'Porta inviolata', pl: 'Czyste konta', cs: 'Čisté konto', ru: 'Сухие матчи', tr: 'Gol yemeden' },
  'Saves': { es: 'Paradas', pt: 'Defesas', fr: 'Arrêts', de: 'Paraden', it: 'Parate', pl: 'Obrony', cs: 'Zákroky', ru: 'Сейвы', tr: 'Kurtarışlar' },
  'Appearances': { es: 'Apariciones', pt: 'Aparições', fr: 'Apparitions', de: 'Einsätze', it: 'Presenze', pl: 'Występy', cs: 'Vystoupení', ru: 'Выступления', tr: 'Maçlar' },
  'Yellow Cards': { es: 'Tarjetas amarillas', pt: 'Cartões amarelos', fr: 'Cartons jaunes', de: 'Gelbe Karten', it: 'Cartellini gialli', pl: 'Żółte kartki', cs: 'Žluté karty', ru: 'Жёлтые карточки', tr: 'Sarı kartlar' },
  'Red Cards': { es: 'Tarjetas rojas', pt: 'Cartões vermelhos', fr: 'Cartons rouges', de: 'Rote Karten', it: 'Cartellini rossi', pl: 'Czerwone kartki', cs: 'Červené karty', ru: 'Красные карточки', tr: 'Kırmızı kartlar' },
  'Starts': { es: 'Titularidades', pt: 'Titularidades', fr: 'Titularisations', de: 'Startelf', it: 'Titolare', pl: 'Występy w pierwszym składzie', cs: 'Základní sestava', ru: 'В стартовом составе', tr: 'İlk 11' },
};

// Scheme history label translations
export const schemeHistoryLabels: Record<string, Record<string, string>> = {
  'CURRENT CLUB': { es: 'CLUB ACTUAL', pt: 'CLUBE ATUAL', fr: 'CLUB ACTUEL', de: 'AKTUELLER VEREIN', it: 'CLUB ATTUALE', pl: 'OBECNY KLUB', cs: 'AKTUÁLNÍ KLUB', ru: 'ТЕКУЩИЙ КЛУБ', tr: 'MEVCUT KULÜP' },
  'MATCHES': { es: 'PARTIDOS', pt: 'PARTIDAS', fr: 'MATCHS', de: 'SPIELE', it: 'PARTITE', pl: 'MECZE', cs: 'ZÁPASY', ru: 'МАТЧИ', tr: 'MAÇLAR' },
};

// "In Numbers" stat label translations
export const inNumbersStatTranslations: Record<string, Record<string, string>> = {
  'Goals this season': { es: 'Goles esta temporada', pt: 'Gols nesta temporada', fr: 'Buts cette saison', de: 'Tore diese Saison', it: 'Gol questa stagione', pl: 'Gole w tym sezonie', cs: 'Góly v této sezóně', ru: 'Голы в этом сезоне', tr: 'Bu sezon golleri' },
  'Clean sheets this season': { es: 'Porterías imbatidas esta temporada', pt: 'Jogos sem sofrer gol nesta temporada', fr: 'Clean sheets cette saison', de: 'Zu-Null-Spiele diese Saison', it: 'Porta inviolata questa stagione', pl: 'Czyste konta w tym sezonie', cs: 'Čistá konta v této sezóně', ru: 'Сухие матчи в этом сезоне', tr: 'Bu sezon gol yemeden' },
  'Assists this season': { es: 'Asistencias esta temporada', pt: 'Assistências nesta temporada', fr: 'Passes décisives cette saison', de: 'Assists diese Saison', it: 'Assist questa stagione', pl: 'Asysty w tym sezonie', cs: 'Asistence v této sezóně', ru: 'Ассисты в этом сезоне', tr: 'Bu sezon asistler' },
  'League clean sheets': { es: 'Porterías imbatidas en liga', pt: 'Jogos sem sofrer gol na liga', fr: 'Clean sheets en championnat', de: 'Liga Zu-Null-Spiele', it: 'Porta inviolata in campionato', pl: 'Czyste konta w lidze', cs: 'Čistá konta v lize', ru: 'Сухие матчи в лиге', tr: 'Lig gol yemeden' },
  'League goals': { es: 'Goles en liga', pt: 'Gols na liga', fr: 'Buts en championnat', de: 'Liga Tore', it: 'Gol in campionato', pl: 'Gole w lidze', cs: 'Góly v lize', ru: 'Голы в лиге', tr: 'Lig golleri' },
  'League assists': { es: 'Asistencias en liga', pt: 'Assistências na liga', fr: 'Passes décisives en championnat', de: 'Liga Assists', it: 'Assist in campionato', pl: 'Asysty w lidze', cs: 'Asistence v lize', ru: 'Ассисты в лиге', tr: 'Lig asistleri' },
  'IN LEAGUE': { es: 'EN LIGA', pt: 'NA LIGA', fr: 'EN CHAMPIONNAT', de: 'IN DER LIGA', it: 'IN CAMPIONATO', pl: 'W LIDZE', cs: 'V LIZE', ru: 'В ЛИГЕ', tr: 'LİGDE' },
  'Career goals': { es: 'Goles en carrera', pt: 'Gols na carreira', fr: 'Buts en carrière', de: 'Karriere Tore', it: 'Gol in carriera', pl: 'Gole w karierze', cs: 'Góly v kariéře', ru: 'Голы за карьеру', tr: 'Kariyer golleri' },
  'Career assists': { es: 'Asistencias en carrera', pt: 'Assistências na carreira', fr: 'Passes décisives en carrière', de: 'Karriere Assists', it: 'Assist in carriera', pl: 'Asysty w karierze', cs: 'Asistence v kariéře', ru: 'Ассисты за карьеру', tr: 'Kariyer asistleri' },
  'Career clean sheets': { es: 'Porterías imbatidas en carrera', pt: 'Jogos sem sofrer gol na carreira', fr: 'Clean sheets en carrière', de: 'Karriere Zu-Null-Spiele', it: 'Porta inviolata in carriera', pl: 'Czyste konta w karierze', cs: 'Čistá konta v kariéře', ru: 'Сухие матчи за карьеру', tr: 'Kariyer gol yemeden' },
  'Minutes played': { es: 'Minutos jugados', pt: 'Minutos jogados', fr: 'Minutes jouées', de: 'Gespielte Minuten', it: 'Minuti giocati', pl: 'Rozegrane minuty', cs: 'Odehrané minuty', ru: 'Сыгранные минуты', tr: 'Oynanan dakikalar' },
  'Matches played': { es: 'Partidos jugados', pt: 'Partidas jogadas', fr: 'Matchs joués', de: 'Gespielte Spiele', it: 'Partite giocate', pl: 'Rozegrane mecze', cs: 'Odehrané zápasy', ru: 'Сыгранные матчи', tr: 'Oynanan maçlar' },
  'Goal contributions': { es: 'Contribuciones de gol', pt: 'Participações em gols', fr: 'Participations aux buts', de: 'Torbeteiligungen', it: 'Partecipazioni ai gol', pl: 'Udział w golach', cs: 'Podíl na gólech', ru: 'Участие в голах', tr: 'Gol katkıları' },
  'Save percentage': { es: 'Porcentaje de paradas', pt: 'Percentual de defesas', fr: 'Pourcentage d\'arrêts', de: 'Haltequote', it: 'Percentuale di parate', pl: 'Procent obron', cs: 'Procento zákroků', ru: 'Процент сейвов', tr: 'Kurtarış yüzdesi' },
};

// Performance stat translations for HighlightedMatchDisplay
export const performanceStatTranslations: Record<string, Record<string, string>> = {
  'Goals': { es: 'Goles', pt: 'Gols', fr: 'Buts', de: 'Tore', it: 'Gol', pl: 'Gole', cs: 'Góly', ru: 'Голы', tr: 'Goller' },
  'Assists': { es: 'Asistencias', pt: 'Assistências', fr: 'Passes décisives', de: 'Assists', it: 'Assist', pl: 'Asysty', cs: 'Asistence', ru: 'Ассисты', tr: 'Asistler' },
  'xG': { es: 'xG', pt: 'xG', fr: 'xG', de: 'xG', it: 'xG', pl: 'xG', cs: 'xG', ru: 'xG', tr: 'xG' },
  'xA': { es: 'xA', pt: 'xA', fr: 'xA', de: 'xA', it: 'xA', pl: 'xA', cs: 'xA', ru: 'xA', tr: 'xA' },
  'Prog Passes': { es: 'Pases Prog', pt: 'Passes Prog', fr: 'Passes Prog', de: 'Prog Pässe', it: 'Passaggi Prog', pl: 'Podania Prog', cs: 'Prog přihrávky', ru: 'Прог пасы', tr: 'İleriye Paslar' },
  'Regains': { es: 'Recuperaciones', pt: 'Recuperações', fr: 'Récupérations', de: 'Rückgewinne', it: 'Recuperi', pl: 'Odzyskania', cs: 'Získání', ru: 'Возвраты', tr: 'Top Kazanma' },
  'Turnovers': { es: 'Pérdidas', pt: 'Perdas', fr: 'Pertes', de: 'Ballverluste', it: 'Palle perse', pl: 'Straty', cs: 'Ztráty', ru: 'Потери', tr: 'Top Kayıpları' },
  'Duels Won': { es: 'Duelos ganados', pt: 'Duelos ganhos', fr: 'Duels gagnés', de: 'Gewonnene Duelle', it: 'Duelli vinti', pl: 'Wygrane pojedynki', cs: 'Vyhrané souboje', ru: 'Выигранные дуэли', tr: 'Kazanılan İkili Mücadeleler' },
  'Aerial Duels': { es: 'Duelos aéreos', pt: 'Duelos aéreos', fr: 'Duels aériens', de: 'Kopfballduelle', it: 'Duelli aerei', pl: 'Pojedynki powietrzne', cs: 'Hlavičkové souboje', ru: 'Воздушные дуэли', tr: 'Hava Topları' },
  'xG Chain': { es: 'Cadena xG', pt: 'Cadeia xG', fr: 'Chaîne xG', de: 'xG-Kette', it: 'Catena xG', pl: 'Łańcuch xG', cs: 'xG řetěz', ru: 'Цепочка xG', tr: 'xG Zinciri' },
  'Interceptions': { es: 'Intercepciones', pt: 'Interceptações', fr: 'Interceptions', de: 'Abfangaktionen', it: 'Intercetti', pl: 'Przechwyty', cs: 'Zachycení', ru: 'Перехваты', tr: 'Topları Kesme' },
  'Crossing xC': { es: 'Centros xC', pt: 'Cruzamentos xC', fr: 'Centres xC', de: 'Flanken xC', it: 'Cross xC', pl: 'Dośrodkowania xC', cs: 'Centry xC', ru: 'Кроссы xC', tr: 'Orta xC' },
  'In Behind xC': { es: 'A espaldas xC', pt: 'Por trás xC', fr: 'Dans le dos xC', de: 'Hinter die Abwehr xC', it: 'Alle spalle xC', pl: 'Za plecy xC', cs: 'Za obranu xC', ru: 'За спину xC', tr: 'Arkaya xC' },
  'To Feet xC': { es: 'Al pie xC', pt: 'Nos pés xC', fr: 'Dans les pieds xC', de: 'In den Fuß xC', it: 'Sui piedi xC', pl: 'Do nóg xC', cs: 'Do nohou xC', ru: 'В ноги xC', tr: 'Ayağa xC' },
  'Triple Threat xC': { es: 'Triple amenaza xC', pt: 'Tripla ameaça xC', fr: 'Triple menace xC', de: 'Dreifache Bedrohung xC', it: 'Tripla minaccia xC', pl: 'Potrójne zagrożenie xC', cs: 'Trojitá hrozba xC', ru: 'Тройная угроза xC', tr: 'Üçlü Tehdit xC' },
  'Tackles': { es: 'Entradas', pt: 'Desarmes', fr: 'Tacles', de: 'Tacklings', it: 'Contrasti', pl: 'Odbiory', cs: 'Zákroky', ru: 'Отборы', tr: 'Müdahaleler' },
  'Passes': { es: 'Pases', pt: 'Passes', fr: 'Passes', de: 'Pässe', it: 'Passaggi', pl: 'Podania', cs: 'Přihrávky', ru: 'Передачи', tr: 'Paslar' },
  'Shots': { es: 'Tiros', pt: 'Finalizações', fr: 'Tirs', de: 'Schüsse', it: 'Tiri', pl: 'Strzały', cs: 'Střely', ru: 'Удары', tr: 'Şutlar' },
  'On Target': { es: 'A puerta', pt: 'No alvo', fr: 'Cadrés', de: 'Auf Tor', it: 'In porta', pl: 'Celne', cs: 'Na branku', ru: 'В створ', tr: 'İsabetli' },
};

export function usePlayerTranslations({ bio, position, playerId, strengths = [] }: UsePlayerTranslationsOptions) {
  const { language } = useLanguage();
  const [translatedBio, setTranslatedBio] = useState<string>(bio);
  const [translatedStrengths, setTranslatedStrengths] = useState<string[]>(strengths);
  const [isTranslating, setIsTranslating] = useState(false);

  // Translate position immediately using useMemo for proper reactivity
  const translatedPosition = useMemo(() => {
    if (language === 'en') return position;
    return positionTranslations[position]?.[language] || position;
  }, [language, position]);

  useEffect(() => {
    // Reset to original when language is English
    if (language === 'en') {
      setTranslatedBio(bio);
      setTranslatedStrengths(strengths);
      return;
    }

    const translateContent = async () => {
      if (!bio || bio.trim() === '') {
        setTranslatedBio('');
      }

      // Check cache for bio
      const bioCacheKey = `player_bio_${playerId}_${language}`;
      const strengthsCacheKey = `player_strengths_${playerId}_${language}`;
      
      let cachedBio = null;
      let cachedStrengths = null;
      
      try {
        const cached = localStorage.getItem(bioCacheKey);
        if (cached) {
          const parsed = JSON.parse(cached);
          if (parsed.bio) cachedBio = parsed.bio;
        }
        const cachedStr = localStorage.getItem(strengthsCacheKey);
        if (cachedStr) {
          const parsed = JSON.parse(cachedStr);
          if (parsed.strengths) cachedStrengths = parsed.strengths;
        }
      } catch { /* ignore */ }

      if (cachedBio) setTranslatedBio(cachedBio);
      if (cachedStrengths) setTranslatedStrengths(cachedStrengths);
      
      // If both are cached, return
      if (cachedBio && (strengths.length === 0 || cachedStrengths)) return;

      setIsTranslating(true);
      
      const langMap: Record<string, string> = {
        'es': 'spanish',
        'pt': 'portuguese',
        'fr': 'french',
        'de': 'german',
        'it': 'italian',
        'pl': 'polish',
        'cs': 'czech',
        'ru': 'russian',
        'tr': 'turkish'
      };
      const translationKey = langMap[language];

      try {
        // Translate bio if not cached
        if (!cachedBio && bio) {
          const { data, error } = await supabase.functions.invoke('ai-translate', {
            body: { text: bio }
          });

          if (!error && data?.[translationKey]) {
            localStorage.setItem(bioCacheKey, JSON.stringify({ bio: data[translationKey] }));
            setTranslatedBio(data[translationKey]);
          }
        }

        // Translate strengths if not cached and strengths exist
        if (!cachedStrengths && strengths.length > 0) {
          const strengthsText = strengths.join('\n---\n');
          const { data, error } = await supabase.functions.invoke('ai-translate', {
            body: { text: strengthsText }
          });

          if (!error && data?.[translationKey]) {
            const translatedArray = data[translationKey].split('\n---\n').map((s: string) => s.trim()).filter(Boolean);
            localStorage.setItem(strengthsCacheKey, JSON.stringify({ strengths: translatedArray }));
            setTranslatedStrengths(translatedArray);
          }
        }
      } catch (err) {
        console.error('Player content translation error:', err);
      } finally {
        setIsTranslating(false);
      }
    };

    translateContent();
  }, [bio, language, playerId, strengths]);

  // Use useMemo to ensure the returned object updates when language changes
  const translatedContent = useMemo(() => ({
    bio: translatedBio,
    position: translatedPosition,
    strengths: translatedStrengths,
  }), [translatedBio, translatedPosition, translatedStrengths]);

  return { 
    translatedContent, 
    isTranslating 
  };
}

// Helper function to translate country names
export function useTranslatedCountry(country: string): string {
  const { language } = useLanguage();
  return useMemo(() => {
    if (language === 'en' || !country) return country;
    return countryTranslations[country]?.[language] || country;
  }, [country, language]);
}

// Helper function to translate season stat headers
export function useTranslatedStatHeader(header: string): string {
  const { language } = useLanguage();
  return useMemo(() => {
    if (language === 'en' || !header) return header;
    return seasonStatTranslations[header]?.[language] || header;
  }, [header, language]);
}

// Helper function to translate scheme history labels
export function useTranslatedSchemeLabel(label: string, matchCount?: number): string {
  const { language } = useLanguage();
  return useMemo(() => {
    if (language === 'en' || !label) return label;
    if (label === 'CURRENT CLUB') {
      return schemeHistoryLabels['CURRENT CLUB']?.[language] || label;
    }
    if (matchCount !== undefined) {
      const matchesWord = schemeHistoryLabels['MATCHES']?.[language] || 'MATCHES';
      return `${matchCount} ${matchesWord}`;
    }
    return label;
  }, [label, language, matchCount]);
}

// Static label translations for player profile page
export const playerProfileLabels: Record<string, Record<string, string>> = {
  biography: {
    en: 'Biography',
    es: 'Biografía',
    pt: 'Biografia',
    fr: 'Biographie',
    de: 'Biografie',
    it: 'Biografia',
    pl: 'Biografia',
    cs: 'Životopis',
    ru: 'Биография',
    tr: 'Biyografi',
  },
  readMore: {
    en: 'Read More',
    es: 'Leer más',
    pt: 'Ler mais',
    fr: 'Lire plus',
    de: 'Mehr lesen',
    it: 'Leggi di più',
    pl: 'Czytaj więcej',
    cs: 'Číst více',
    ru: 'Читать далее',
    tr: 'Daha fazla oku',
  },
  externalLinks: {
    en: 'External Links',
    es: 'Enlaces externos',
    pt: 'Links externos',
    fr: 'Liens externes',
    de: 'Externe Links',
    it: 'Link esterni',
    pl: 'Linki zewnętrzne',
    cs: 'Externí odkazy',
    ru: 'Внешние ссылки',
    tr: 'Dış bağlantılar',
  },
  inNumbers: {
    en: 'In Numbers',
    es: 'En números',
    pt: 'Em números',
    fr: 'En chiffres',
    de: 'In Zahlen',
    it: 'In numeri',
    pl: 'W liczbach',
    cs: 'V číslech',
    ru: 'В цифрах',
    tr: 'Rakamlarla',
  },
  seasonStats: {
    en: 'Season Stats',
    es: 'Estadísticas de temporada',
    pt: 'Estatísticas da temporada',
    fr: 'Statistiques de saison',
    de: 'Saisonstatistiken',
    it: 'Statistiche stagionali',
    pl: 'Statystyki sezonu',
    cs: 'Statistiky sezóny',
    ru: 'Статистика сезона',
    tr: 'Sezon istatistikleri',
  },
  strengths: {
    en: 'Strengths',
    es: 'Fortalezas',
    pt: 'Pontos fortes',
    fr: 'Points forts',
    de: 'Stärken',
    it: 'Punti di forza',
    pl: 'Mocne strony',
    cs: 'Silné stránky',
    ru: 'Сильные стороны',
    tr: 'Güçlü yönler',
  },
  tacticalFormations: {
    en: 'Tactical Formations',
    es: 'Formaciones tácticas',
    pt: 'Formações táticas',
    fr: 'Formations tactiques',
    de: 'Taktische Formationen',
    it: 'Formazioni tattiche',
    pl: 'Formacje taktyczne',
    cs: 'Taktické formace',
    ru: 'Тактические построения',
    tr: 'Taktik dizilişler',
  },
  schemeHistory: {
    en: 'Scheme History',
    es: 'Historial de esquemas',
    pt: 'Histórico de esquemas',
    fr: 'Historique des schémas',
    de: 'Schemenhistorie',
    it: 'Cronologia schemi',
    pl: 'Historia schematów',
    cs: 'Historie schémat',
    ru: 'История схем',
    tr: 'Şema geçmişi',
  },
  performanceReports: {
    en: 'Performance Reports',
    es: 'Informes de rendimiento',
    pt: 'Relatórios de desempenho',
    fr: 'Rapports de performance',
    de: 'Leistungsberichte',
    it: 'Report prestazioni',
    pl: 'Raporty wydajności',
    cs: 'Výkonnostní zprávy',
    ru: 'Отчёты о результатах',
    tr: 'Performans raporları',
  },
  recentMatches: {
    en: 'Recent Matches',
    es: 'Partidos recientes',
    pt: 'Partidas recentes',
    fr: 'Matchs récents',
    de: 'Letzte Spiele',
    it: 'Partite recenti',
    pl: 'Ostatnie mecze',
    cs: 'Nedávné zápasy',
    ru: 'Последние матчи',
    tr: 'Son maçlar',
  },
  backToStars: {
    en: 'Back to Stars',
    es: 'Volver a estrellas',
    pt: 'Voltar para estrelas',
    fr: 'Retour aux étoiles',
    de: 'Zurück zu den Stars',
    it: 'Torna alle stelle',
    pl: 'Powrót do gwiazd',
    cs: 'Zpět k hvězdám',
    ru: 'Назад к звёздам',
    tr: 'Yıldızlara dön',
  },
  enquirePlayer: {
    en: 'Enquire About This Player',
    es: 'Consultar sobre este jugador',
    pt: 'Perguntar sobre este jogador',
    fr: 'Se renseigner sur ce joueur',
    de: 'Über diesen Spieler anfragen',
    it: 'Informarsi su questo giocatore',
    pl: 'Zapytaj o tego zawodnika',
    cs: 'Dotaz na tohoto hráče',
    ru: 'Узнать об этом игроке',
    tr: 'Bu oyuncu hakkında bilgi al',
  },
  loadingPlayer: {
    en: 'Loading player...',
    es: 'Cargando jugador...',
    pt: 'Carregando jogador...',
    fr: 'Chargement du joueur...',
    de: 'Spieler wird geladen...',
    it: 'Caricamento giocatore...',
    pl: 'Ładowanie zawodnika...',
    cs: 'Načítání hráče...',
    ru: 'Загрузка игрока...',
    tr: 'Oyuncu yükleniyor...',
  },
  playerNotFound: {
    en: 'Player Not Found',
    es: 'Jugador no encontrado',
    pt: 'Jogador não encontrado',
    fr: 'Joueur non trouvé',
    de: 'Spieler nicht gefunden',
    it: 'Giocatore non trovato',
    pl: 'Zawodnik nie znaleziony',
    cs: 'Hráč nenalezen',
    ru: 'Игрок не найден',
    tr: 'Oyuncu bulunamadı',
  },
  backToDirectory: {
    en: 'Back to Directory',
    es: 'Volver al directorio',
    pt: 'Voltar ao diretório',
    fr: 'Retour au répertoire',
    de: 'Zurück zum Verzeichnis',
    it: 'Torna alla directory',
    pl: 'Powrót do katalogu',
    cs: 'Zpět do adresáře',
    ru: 'Назад к каталогу',
    tr: 'Dizine dön',
  },
  highlights: {
    en: 'Highlights',
    es: 'Destacados',
    pt: 'Destaques',
    fr: 'Points forts',
    de: 'Highlights',
    it: 'Highlights',
    pl: 'Najważniejsze momenty',
    cs: 'Sestřihy',
    ru: 'Лучшие моменты',
    tr: 'Öne çıkanlar',
  },
  comingSoon: {
    en: 'Coming Soon',
    es: 'Próximamente',
    pt: 'Em breve',
    fr: 'Bientôt disponible',
    de: 'Demnächst',
    it: 'Prossimamente',
    pl: 'Wkrótce',
    cs: 'Již brzy',
    ru: 'Скоро',
    tr: 'Yakında',
  },
  strengthsPlayStyle: {
    en: 'Strengths & Play Style',
    es: 'Fortalezas y estilo de juego',
    pt: 'Pontos fortes e estilo de jogo',
    fr: 'Points forts et style de jeu',
    de: 'Stärken & Spielstil',
    it: 'Punti di forza e stile di gioco',
    pl: 'Mocne strony i styl gry',
    cs: 'Silné stránky a styl hry',
    ru: 'Сильные стороны и стиль игры',
    tr: 'Güçlü yönler ve oyun tarzı',
  },
  getInTouch: {
    en: 'Get In Touch',
    es: 'Ponte en contacto',
    pt: 'Entre em contato',
    fr: 'Contactez-nous',
    de: 'Kontakt aufnehmen',
    it: 'Contattaci',
    pl: 'Skontaktuj się',
    cs: 'Kontaktujte nás',
    ru: 'Свяжитесь с нами',
    tr: 'İletişime geçin',
  },
  clubsAgents: {
    en: 'Clubs & Agents',
    es: 'Clubes y agentes',
    pt: 'Clubes e agentes',
    fr: 'Clubs et agents',
    de: 'Vereine & Agenten',
    it: 'Club e agenti',
    pl: 'Kluby i agenci',
    cs: 'Kluby a agenti',
    ru: 'Клубы и агенты',
    tr: 'Kulüpler ve ajanlar',
  },
  interestedInSigning: {
    en: "Interested in signing this player? Let's discuss opportunities.",
    es: '¿Interesado en fichar a este jugador? Hablemos de oportunidades.',
    pt: 'Interessado em contratar este jogador? Vamos discutir oportunidades.',
    fr: 'Intéressé par ce joueur? Discutons des opportunités.',
    de: 'Interesse an diesem Spieler? Lassen Sie uns über Möglichkeiten sprechen.',
    it: 'Interessato a ingaggiare questo giocatore? Parliamo delle opportunità.',
    pl: 'Zainteresowany podpisaniem umowy z tym zawodnikiem? Porozmawiajmy o możliwościach.',
    cs: 'Máte zájem o tohoto hráče? Pojďme probrat možnosti.',
    ru: 'Заинтересованы в этом игроке? Давайте обсудим возможности.',
    tr: 'Bu oyuncuyu transfer etmek ister misiniz? Fırsatları tartışalım.',
  },
  media: {
    en: 'Media',
    es: 'Medios',
    pt: 'Mídia',
    fr: 'Médias',
    de: 'Medien',
    it: 'Media',
    pl: 'Media',
    cs: 'Média',
    ru: 'СМИ',
    tr: 'Medya',
  },
  pressInquiries: {
    en: 'Press inquiries and interview requests welcome.',
    es: 'Consultas de prensa y solicitudes de entrevistas son bienvenidas.',
    pt: 'Consultas de imprensa e pedidos de entrevista são bem-vindos.',
    fr: 'Les demandes de presse et les demandes d\'interview sont les bienvenues.',
    de: 'Presseanfragen und Interviewanfragen willkommen.',
    it: 'Richieste stampa e interviste benvenute.',
    pl: 'Zapytania prasowe i prośby o wywiady mile widziane.',
    cs: 'Dotazy tisku a žádosti o rozhovory vítány.',
    ru: 'Приветствуются запросы от прессы и заявки на интервью.',
    tr: 'Basın soruları ve röportaj talepleri memnuniyetle karşılanır.',
  },
  contact: {
    en: 'Contact',
    es: 'Contactar',
    pt: 'Contato',
    fr: 'Contacter',
    de: 'Kontakt',
    it: 'Contatta',
    pl: 'Kontakt',
    cs: 'Kontakt',
    ru: 'Связаться',
    tr: 'İletişim',
  },
  sponsors: {
    en: 'Sponsors',
    es: 'Patrocinadores',
    pt: 'Patrocinadores',
    fr: 'Sponsors',
    de: 'Sponsoren',
    it: 'Sponsor',
    pl: 'Sponsorzy',
    cs: 'Sponzoři',
    ru: 'Спонсоры',
    tr: 'Sponsorlar',
  },
  sponsorOpportunities: {
    en: 'Explore partnership and sponsorship opportunities.',
    es: 'Explore oportunidades de asociación y patrocinio.',
    pt: 'Explore oportunidades de parceria e patrocínio.',
    fr: 'Explorez les opportunités de partenariat et de sponsoring.',
    de: 'Erkunden Sie Partnerschafts- und Sponsoring-Möglichkeiten.',
    it: 'Esplora opportunità di partnership e sponsorizzazione.',
    pl: 'Poznaj możliwości partnerstwa i sponsoringu.',
    cs: 'Prozkoumejte možnosti partnerství a sponzorství.',
    ru: 'Изучите возможности партнёрства и спонсорства.',
    tr: 'Ortaklık ve sponsorluk fırsatlarını keşfedin.',
  },
  reachOut: {
    en: 'Reach Out',
    es: 'Contactar',
    pt: 'Entrar em contato',
    fr: 'Nous contacter',
    de: 'Kontaktieren',
    it: 'Contattaci',
    pl: 'Skontaktuj się',
    cs: 'Ozvěte se',
    ru: 'Связаться',
    tr: 'İletişime geçin',
  },
  readActionReport: {
    en: 'Read Action Report',
    es: 'Leer informe de acción',
    pt: 'Ler relatório de ação',
    fr: 'Lire le rapport d\'action',
    de: 'Aktionsbericht lesen',
    it: 'Leggi il rapporto d\'azione',
    pl: 'Przeczytaj raport akcji',
    cs: 'Přečíst zprávu o akci',
    ru: 'Читать отчёт о действиях',
    tr: 'Eylem raporunu oku',
  },
  watchFullMatch: {
    en: 'Watch Full Match',
    es: 'Ver partido completo',
    pt: 'Assistir partida completa',
    fr: 'Regarder le match complet',
    de: 'Vollständiges Spiel ansehen',
    it: 'Guarda la partita completa',
    pl: 'Obejrzyj cały mecz',
    cs: 'Sledovat celý zápas',
    ru: 'Смотреть полный матч',
    tr: 'Tüm maçı izle',
  },
  highlightedPerformance: {
    en: 'Highlighted Performance',
    es: 'Rendimiento destacado',
    pt: 'Desempenho destacado',
    fr: 'Performance mise en avant',
    de: 'Hervorgehobene Leistung',
    it: 'Prestazione in evidenza',
    pl: 'Wyróżniony występ',
    cs: 'Zvýrazněný výkon',
    ru: 'Выделенное выступление',
    tr: 'Öne çıkan performans',
  },
  performanceMetrics: {
    en: 'Performance Metrics',
    es: 'Métricas de rendimiento',
    pt: 'Métricas de desempenho',
    fr: 'Métriques de performance',
    de: 'Leistungskennzahlen',
    it: 'Metriche di prestazione',
    pl: 'Wskaźniki wydajności',
    cs: 'Výkonnostní metriky',
    ru: 'Показатели производительности',
    tr: 'Performans metrikleri',
  },
};

export function usePlayerProfileLabel(key: keyof typeof playerProfileLabels): string {
  const { language } = useLanguage();
  
  // Memoize to ensure reactivity when language changes
  const label = useMemo(() => {
    const translations = playerProfileLabels[key];
    if (!translations) {
      return key;
    }
    const langKey = language as LanguageCode;
    return translations[langKey] || translations.en || key;
  }, [key, language]);
  
  return label;
}
