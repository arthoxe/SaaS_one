--
-- PostgreSQL database dump
--

\restrict YNZFYbnKyu7ErZThH9xYekHFZAQAaLVcody8mJTtDPWI6YmhSmmWfdAIMN5v2VF

-- Dumped from database version 16.11 (Ubuntu 16.11-0ubuntu0.24.04.1)
-- Dumped by pg_dump version 16.11 (Ubuntu 16.11-0ubuntu0.24.04.1)

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: pg_trgm; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS pg_trgm WITH SCHEMA public;


--
-- Name: EXTENSION pg_trgm; Type: COMMENT; Schema: -; Owner: 
--

COMMENT ON EXTENSION pg_trgm IS 'text similarity measurement and index searching based on trigrams';


--
-- Name: unaccent; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS unaccent WITH SCHEMA public;


--
-- Name: EXTENSION unaccent; Type: COMMENT; Schema: -; Owner: 
--

COMMENT ON EXTENSION unaccent IS 'text search dictionary that removes accents';


--
-- Name: uuid-ossp; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA public;


--
-- Name: EXTENSION "uuid-ossp"; Type: COMMENT; Schema: -; Owner: 
--

COMMENT ON EXTENSION "uuid-ossp" IS 'generate universally unique identifiers (UUIDs)';


--
-- Name: equipement_type; Type: TYPE; Schema: public; Owner: exhelia
--

CREATE TYPE public.equipement_type AS ENUM (
    'vmc',
    'pac',
    'solaire',
    'chaudiere',
    'ventilation',
    'climatisation',
    'autre'
);


ALTER TYPE public.equipement_type OWNER TO exhelia;

--
-- Name: intervention_statut; Type: TYPE; Schema: public; Owner: exhelia
--

CREATE TYPE public.intervention_statut AS ENUM (
    'planifiee',
    'en_cours',
    'terminee',
    'annulee'
);


ALTER TYPE public.intervention_statut OWNER TO exhelia;

--
-- Name: user_role; Type: TYPE; Schema: public; Owner: exhelia
--

CREATE TYPE public.user_role AS ENUM (
    'admin',
    'bureau',
    'technicien',
    'particulier',
    'bailleur',
    'pro'
);


ALTER TYPE public.user_role OWNER TO exhelia;

--
-- Name: interventions_search_update(); Type: FUNCTION; Schema: public; Owner: exhelia
--

CREATE FUNCTION public.interventions_search_update() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    NEW.search_vector := to_tsvector('french',
        unaccent(COALESCE(NEW.notes_bureau, ''))
    );
    RETURN NEW;
END;
$$;


ALTER FUNCTION public.interventions_search_update() OWNER TO exhelia;

--
-- Name: logements_search_update(); Type: FUNCTION; Schema: public; Owner: exhelia
--

CREATE FUNCTION public.logements_search_update() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    NEW.search_vector := to_tsvector('french',
        unaccent(COALESCE(NEW.adresse, '')) || ' ' ||
        unaccent(COALESCE(NEW.ville, '')) || ' ' ||
        unaccent(COALESCE(NEW.code_postal, '')) || ' ' ||
        unaccent(COALESCE(NEW.nom_locataire, ''))
    );
    RETURN NEW;
END;
$$;


ALTER FUNCTION public.logements_search_update() OWNER TO exhelia;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: calculs_eco; Type: TABLE; Schema: public; Owner: exhelia
--

CREATE TABLE public.calculs_eco (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    equipement_id uuid,
    periode_debut date NOT NULL,
    periode_fin date NOT NULL,
    conso_kwh numeric(10,2),
    economies_eur numeric(10,2),
    co2_evite_kg numeric(10,2),
    computed_at timestamp without time zone DEFAULT now()
);


ALTER TABLE public.calculs_eco OWNER TO exhelia;

--
-- Name: capteurs; Type: TABLE; Schema: public; Owner: exhelia
--

CREATE TABLE public.capteurs (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    equipement_id uuid,
    nom character varying(100) NOT NULL,
    type character varying(50),
    unite character varying(20),
    actif boolean DEFAULT true,
    created_at timestamp without time zone DEFAULT now()
);


ALTER TABLE public.capteurs OWNER TO exhelia;

--
-- Name: chefs_equipe; Type: TABLE; Schema: public; Owner: exhelia
--

CREATE TABLE public.chefs_equipe (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    user_id uuid,
    nom character varying(100) NOT NULL,
    prenom character varying(100) NOT NULL,
    telephone character varying(20),
    created_at timestamp without time zone DEFAULT now()
);


ALTER TABLE public.chefs_equipe OWNER TO exhelia;

--
-- Name: clients; Type: TABLE; Schema: public; Owner: exhelia
--

CREATE TABLE public.clients (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    user_id uuid,
    type character varying(20) NOT NULL,
    nom character varying(100) NOT NULL,
    prenom character varying(100),
    raison_sociale character varying(150),
    siret character varying(20),
    telephone character varying(20),
    created_at timestamp without time zone DEFAULT now(),
    CONSTRAINT clients_type_check CHECK (((type)::text = ANY ((ARRAY['particulier'::character varying, 'bailleur'::character varying, 'pro'::character varying])::text[])))
);


ALTER TABLE public.clients OWNER TO exhelia;

--
-- Name: equipements; Type: TABLE; Schema: public; Owner: exhelia
--

CREATE TABLE public.equipements (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    logement_id uuid,
    type public.equipement_type NOT NULL,
    marque character varying(100),
    modele character varying(100),
    numero_serie character varying(100),
    date_install date,
    derniere_inter date,
    actif boolean DEFAULT true,
    created_at timestamp without time zone DEFAULT now()
);


ALTER TABLE public.equipements OWNER TO exhelia;

--
-- Name: equipes; Type: TABLE; Schema: public; Owner: exhelia
--

CREATE TABLE public.equipes (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    chef_id uuid,
    nom character varying(100) NOT NULL,
    created_at timestamp without time zone DEFAULT now()
);


ALTER TABLE public.equipes OWNER TO exhelia;

--
-- Name: interventions; Type: TABLE; Schema: public; Owner: exhelia
--

CREATE TABLE public.interventions (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    logement_id uuid,
    equipement_id uuid,
    technicien_id uuid,
    chef_id uuid,
    type public.equipement_type NOT NULL,
    statut public.intervention_statut DEFAULT 'planifiee'::public.intervention_statut,
    date_prevue date NOT NULL,
    heure_prevue time without time zone,
    duree_prevue integer,
    notes_bureau text,
    urgente boolean DEFAULT false,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now(),
    search_vector tsvector,
    created_by uuid,
    date_fin date,
    heure_fin time without time zone
);


ALTER TABLE public.interventions OWNER TO exhelia;

--
-- Name: logements; Type: TABLE; Schema: public; Owner: exhelia
--

CREATE TABLE public.logements (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    client_id uuid,
    adresse character varying(200) NOT NULL,
    complement character varying(100),
    ville character varying(100) NOT NULL,
    code_postal character varying(10) NOT NULL,
    etage character varying(20),
    numero_porte character varying(20),
    digicode character varying(50),
    telephone_loc character varying(20),
    nom_locataire character varying(150),
    actif boolean DEFAULT true,
    created_at timestamp without time zone DEFAULT now(),
    search_vector tsvector,
    type_lieu character varying(20) DEFAULT 'maison'::character varying
);


ALTER TABLE public.logements OWNER TO exhelia;

--
-- Name: mesures; Type: TABLE; Schema: public; Owner: exhelia
--

CREATE TABLE public.mesures (
    id bigint NOT NULL,
    capteur_id uuid,
    valeur numeric(12,4) NOT NULL,
    "timestamp" timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.mesures OWNER TO exhelia;

--
-- Name: mesures_id_seq; Type: SEQUENCE; Schema: public; Owner: exhelia
--

CREATE SEQUENCE public.mesures_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.mesures_id_seq OWNER TO exhelia;

--
-- Name: mesures_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: exhelia
--

ALTER SEQUENCE public.mesures_id_seq OWNED BY public.mesures.id;


--
-- Name: rapport_champs; Type: TABLE; Schema: public; Owner: exhelia
--

CREATE TABLE public.rapport_champs (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    rapport_id uuid,
    cle character varying(100) NOT NULL,
    valeur text,
    created_at timestamp without time zone DEFAULT now()
);


ALTER TABLE public.rapport_champs OWNER TO exhelia;

--
-- Name: rapport_photos; Type: TABLE; Schema: public; Owner: exhelia
--

CREATE TABLE public.rapport_photos (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    rapport_id uuid,
    chemin character varying(255) NOT NULL,
    legende character varying(200),
    taille_kb integer,
    created_at timestamp without time zone DEFAULT now()
);


ALTER TABLE public.rapport_photos OWNER TO exhelia;

--
-- Name: rapport_signatures; Type: TABLE; Schema: public; Owner: exhelia
--

CREATE TABLE public.rapport_signatures (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    rapport_id uuid,
    data_base64 text NOT NULL,
    signataire_nom character varying(150),
    signed_at timestamp without time zone DEFAULT now()
);


ALTER TABLE public.rapport_signatures OWNER TO exhelia;

--
-- Name: rapports; Type: TABLE; Schema: public; Owner: exhelia
--

CREATE TABLE public.rapports (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    intervention_id uuid,
    technicien_id uuid,
    heure_debut timestamp without time zone,
    heure_fin timestamp without time zone,
    statut_equipement character varying(50),
    travaux_effectues text,
    fournitures text,
    remarques text,
    valide boolean DEFAULT false,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now()
);


ALTER TABLE public.rapports OWNER TO exhelia;

--
-- Name: recherche_globale; Type: MATERIALIZED VIEW; Schema: public; Owner: exhelia
--

CREATE MATERIALIZED VIEW public.recherche_globale AS
 SELECT l.id,
    'logement'::text AS type,
    (((l.adresse)::text || ', '::text) || (l.ville)::text) AS titre,
    (((c.nom)::text || ' '::text) || (COALESCE(c.prenom, ''::character varying))::text) AS client,
    l.search_vector
   FROM (public.logements l
     JOIN public.clients c ON ((c.id = l.client_id)))
UNION ALL
 SELECT i.id,
    'intervention'::text AS type,
    ('Inter. du '::text || to_char((i.date_prevue)::timestamp with time zone, 'DD/MM/YYYY'::text)) AS titre,
    (i.type)::text AS client,
    i.search_vector
   FROM public.interventions i
  WITH NO DATA;


ALTER MATERIALIZED VIEW public.recherche_globale OWNER TO exhelia;

--
-- Name: refresh_tokens; Type: TABLE; Schema: public; Owner: exhelia
--

CREATE TABLE public.refresh_tokens (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    user_id uuid,
    token character varying(500) NOT NULL,
    expires_at timestamp without time zone NOT NULL,
    created_at timestamp without time zone DEFAULT now()
);


ALTER TABLE public.refresh_tokens OWNER TO exhelia;

--
-- Name: techniciens; Type: TABLE; Schema: public; Owner: exhelia
--

CREATE TABLE public.techniciens (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    user_id uuid,
    nom character varying(100) NOT NULL,
    prenom character varying(100) NOT NULL,
    telephone character varying(20),
    photo character varying(255),
    actif boolean DEFAULT true,
    created_at timestamp without time zone DEFAULT now(),
    equipe_id uuid
);


ALTER TABLE public.techniciens OWNER TO exhelia;

--
-- Name: users; Type: TABLE; Schema: public; Owner: exhelia
--

CREATE TABLE public.users (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    email character varying(150) NOT NULL,
    password character varying(255) NOT NULL,
    role public.user_role NOT NULL,
    created_at timestamp without time zone DEFAULT now(),
    last_login timestamp without time zone,
    photo text
);


ALTER TABLE public.users OWNER TO exhelia;

--
-- Name: mesures id; Type: DEFAULT; Schema: public; Owner: exhelia
--

ALTER TABLE ONLY public.mesures ALTER COLUMN id SET DEFAULT nextval('public.mesures_id_seq'::regclass);


--
-- Data for Name: calculs_eco; Type: TABLE DATA; Schema: public; Owner: exhelia
--

COPY public.calculs_eco (id, equipement_id, periode_debut, periode_fin, conso_kwh, economies_eur, co2_evite_kg, computed_at) FROM stdin;
\.


--
-- Data for Name: capteurs; Type: TABLE DATA; Schema: public; Owner: exhelia
--

COPY public.capteurs (id, equipement_id, nom, type, unite, actif, created_at) FROM stdin;
\.


--
-- Data for Name: chefs_equipe; Type: TABLE DATA; Schema: public; Owner: exhelia
--

COPY public.chefs_equipe (id, user_id, nom, prenom, telephone, created_at) FROM stdin;
e48db524-10e0-4eb9-847f-4f7c7558039c	e2ad5bec-96d3-45b5-a5c0-d2a41f667697	Schmidlin	Benoit	03 89 30 23 82	2026-03-04 07:27:04.346529
aa85d59d-ce5d-4fb6-ba21-60c06a05dbd0	1a3179cb-3356-4d36-a1c0-c45cb377f429	Devriendt	Pascal	07 89 37 83 84	2026-03-04 11:01:54.521833
\.


--
-- Data for Name: clients; Type: TABLE DATA; Schema: public; Owner: exhelia
--

COPY public.clients (id, user_id, type, nom, prenom, raison_sociale, siret, telephone, created_at) FROM stdin;
661c93a9-1e98-4987-8132-44f136095af9	6ee5660b-be0f-402b-bcbc-0753f3452f23	particulier	Courtois	Arthur	\N	\N	07 55 61 61 73	2026-03-04 11:04:05.330724
a24c5eb9-d15d-474f-ae54-30751e2f4271	681a48c7-10f3-4179-944a-bef20ce230ff	bailleur	Exhelia	\N	\N	\N	09 76 54 32 89	2026-03-04 11:10:54.217238
1f39a9f2-f3f0-4998-b529-1533f49f9b26	444218be-bce3-4d72-8c5a-8f53d2cb2356	particulier	Francis	Abagnale	\N	\N	07 55 61 61 73	2026-03-04 14:20:31.485168
\.


--
-- Data for Name: equipements; Type: TABLE DATA; Schema: public; Owner: exhelia
--

COPY public.equipements (id, logement_id, type, marque, modele, numero_serie, date_install, derniere_inter, actif, created_at) FROM stdin;
\.


--
-- Data for Name: equipes; Type: TABLE DATA; Schema: public; Owner: exhelia
--

COPY public.equipes (id, chef_id, nom, created_at) FROM stdin;
205ddc16-728e-4ac3-8b81-00892ca76567	e48db524-10e0-4eb9-847f-4f7c7558039c	Equipe	2026-03-04 07:27:13.865288
e035f0d8-06dd-46f4-8923-8d59e8789b2a	aa85d59d-ce5d-4fb6-ba21-60c06a05dbd0	Equipe	2026-03-04 11:02:17.828125
\.


--
-- Data for Name: interventions; Type: TABLE DATA; Schema: public; Owner: exhelia
--

COPY public.interventions (id, logement_id, equipement_id, technicien_id, chef_id, type, statut, date_prevue, heure_prevue, duree_prevue, notes_bureau, urgente, created_at, updated_at, search_vector, created_by, date_fin, heure_fin) FROM stdin;
27f1a3eb-a25a-4f3e-bacf-f72fce84f57b	9d7a823f-e0f0-4634-995d-6a76922ee8ab	\N	cb9e02d8-1699-4c84-bb21-3be3a98832e0	aa85d59d-ce5d-4fb6-ba21-60c06a05dbd0	solaire	planifiee	2026-03-04	10:15:00	\N	\N	f	2026-03-04 11:10:55.324314	2026-03-04 11:10:55.324314		aa85d59d-ce5d-4fb6-ba21-60c06a05dbd0	2026-03-04	10:30:00
52e16617-39fb-4976-bd6d-cd1615deba7e	0c5ca488-a52d-4488-9722-42e207cc82f8	\N	cb9e02d8-1699-4c84-bb21-3be3a98832e0	aa85d59d-ce5d-4fb6-ba21-60c06a05dbd0	solaire	planifiee	2026-03-04	10:30:00	\N	\N	f	2026-03-04 11:10:55.78933	2026-03-04 11:10:55.78933		aa85d59d-ce5d-4fb6-ba21-60c06a05dbd0	2026-03-04	10:45:00
b9863028-d8d2-4ab4-b9da-a5b71d03dd21	a11fec3f-5050-41b7-8441-b19eec32b94a	\N	cb9e02d8-1699-4c84-bb21-3be3a98832e0	aa85d59d-ce5d-4fb6-ba21-60c06a05dbd0	solaire	planifiee	2026-03-04	10:45:00	\N	\N	f	2026-03-04 11:10:55.837119	2026-03-04 11:10:55.837119		aa85d59d-ce5d-4fb6-ba21-60c06a05dbd0	2026-03-04	11:00:00
621d0057-179b-4b13-8127-d07c14a47c1f	74338286-ee25-4b72-bfd5-23324dce7f04	\N	04f8aeff-a5c6-4771-9553-34f016eedea5	aa85d59d-ce5d-4fb6-ba21-60c06a05dbd0	vmc	planifiee	2026-03-04	08:10:00	\N	Caisson VMC à remplacer complètement de A à Z	f	2026-03-04 11:04:06.113367	2026-03-04 13:38:44.510566	'a':3,7,8 'caisson':1 'complet':5 'remplac':4 'vmc':2 'z':9	aa85d59d-ce5d-4fb6-ba21-60c06a05dbd0	2026-03-04	09:10:00
cd8b4bd5-c37a-4a50-be68-c65027520f26	79615a26-0893-4d38-ab4e-6b65709940e9	\N	\N	aa85d59d-ce5d-4fb6-ba21-60c06a05dbd0	vmc	planifiee	2026-03-04	08:20:00	\N	\N	f	2026-03-04 14:20:32.289642	2026-03-04 14:20:32.289642		aa85d59d-ce5d-4fb6-ba21-60c06a05dbd0	2026-03-04	09:20:00
97c7d458-e872-4bce-ad20-06533b4c32b8	9d7a823f-e0f0-4634-995d-6a76922ee8ab	\N	\N	aa85d59d-ce5d-4fb6-ba21-60c06a05dbd0	ventilation	planifiee	2026-03-06	10:00:00	\N	ezazaea	f	2026-03-04 14:22:26.403277	2026-03-04 14:22:26.403277	'ezaza':1	aa85d59d-ce5d-4fb6-ba21-60c06a05dbd0	2026-03-06	10:15:00
0b537b37-debc-442a-a761-138235d55faa	0c5ca488-a52d-4488-9722-42e207cc82f8	\N	\N	aa85d59d-ce5d-4fb6-ba21-60c06a05dbd0	ventilation	planifiee	2026-03-06	10:15:00	\N	ezazaea	f	2026-03-04 14:22:26.452948	2026-03-04 14:22:26.452948	'ezaza':1	aa85d59d-ce5d-4fb6-ba21-60c06a05dbd0	2026-03-06	10:30:00
b154b8ca-4ece-4122-823a-5e4a33e2c86d	0effe0f3-69c0-4830-8336-e8f09854e323	\N	04f8aeff-a5c6-4771-9553-34f016eedea5	aa85d59d-ce5d-4fb6-ba21-60c06a05dbd0	vmc	planifiee	2026-03-05	08:10:00	\N	hggf	f	2026-03-04 14:21:57.732136	2026-03-04 14:39:15.911965	'hggf':1	aa85d59d-ce5d-4fb6-ba21-60c06a05dbd0	2026-03-06	09:10:00
\.


--
-- Data for Name: logements; Type: TABLE DATA; Schema: public; Owner: exhelia
--

COPY public.logements (id, client_id, adresse, complement, ville, code_postal, etage, numero_porte, digicode, telephone_loc, nom_locataire, actif, created_at, search_vector, type_lieu) FROM stdin;
74338286-ee25-4b72-bfd5-23324dce7f04	661c93a9-1e98-4987-8132-44f136095af9	53A rue de wagenbach	\N	Maisonsgoutte	67220	\N	\N	\N	\N	\N	t	2026-03-04 11:04:05.501554	'53a':1 '67220':6 'maisonsgoutt':5 'ru':2 'wagenbach':4	maison
9d7a823f-e0f0-4634-995d-6a76922ee8ab	a24c5eb9-d15d-474f-ae54-30751e2f4271	13 rue des fleurs	\N	Colmar	68000	1	2	A	07 88 99 00 66	Tom Voel	t	2026-03-04 11:10:54.384766	'13':1 '68000':6 'colmar':5 'fleur':4 'ru':2 'tom':7 'voel':8	batiment
0c5ca488-a52d-4488-9722-42e207cc82f8	a24c5eb9-d15d-474f-ae54-30751e2f4271	13 rue des fleurs	\N	Colmar	68000	2	3	B	07 88 98 10 66	jean Capes	t	2026-03-04 11:10:54.449219	'13':1 '68000':6 'cap':8 'colmar':5 'fleur':4 'jean':7 'ru':2	batiment
a11fec3f-5050-41b7-8441-b19eec32b94a	a24c5eb9-d15d-474f-ae54-30751e2f4271	13 rue des fleurs	\N	Colmar	68000	2	1	C	\N	Tim Berton	t	2026-03-04 11:10:54.688616	'13':1 '68000':6 'berton':8 'colmar':5 'fleur':4 'ru':2 'tim':7	batiment
79615a26-0893-4d38-ab4e-6b65709940e9	1f39a9f2-f3f0-4998-b529-1533f49f9b26	17 rue des moines	\N	colamr	68000	\N	\N	\N	\N	\N	t	2026-03-04 14:20:31.621793	'17':1 '68000':6 'colamr':5 'moin':4 'ru':2	maison
0effe0f3-69c0-4830-8336-e8f09854e323	a24c5eb9-d15d-474f-ae54-30751e2f4271	14 rue des jolies	\N	Colmar	680000		\N	\N		Paul Kibier	t	2026-03-04 13:02:01.361862	'14':1 '680000':6 'colmar':5 'jol':4 'kibi':8 'paul':7 'ru':2	maison
\.


--
-- Data for Name: mesures; Type: TABLE DATA; Schema: public; Owner: exhelia
--

COPY public.mesures (id, capteur_id, valeur, "timestamp") FROM stdin;
\.


--
-- Data for Name: rapport_champs; Type: TABLE DATA; Schema: public; Owner: exhelia
--

COPY public.rapport_champs (id, rapport_id, cle, valeur, created_at) FROM stdin;
\.


--
-- Data for Name: rapport_photos; Type: TABLE DATA; Schema: public; Owner: exhelia
--

COPY public.rapport_photos (id, rapport_id, chemin, legende, taille_kb, created_at) FROM stdin;
\.


--
-- Data for Name: rapport_signatures; Type: TABLE DATA; Schema: public; Owner: exhelia
--

COPY public.rapport_signatures (id, rapport_id, data_base64, signataire_nom, signed_at) FROM stdin;
\.


--
-- Data for Name: rapports; Type: TABLE DATA; Schema: public; Owner: exhelia
--

COPY public.rapports (id, intervention_id, technicien_id, heure_debut, heure_fin, statut_equipement, travaux_effectues, fournitures, remarques, valide, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: refresh_tokens; Type: TABLE DATA; Schema: public; Owner: exhelia
--

COPY public.refresh_tokens (id, user_id, token, expires_at, created_at) FROM stdin;
3514eb49-f2c1-4cdf-9aa7-42be541b84c7	ca2f928c-0aa8-433a-8595-29e842b06f1d	5bbcf866-76c7-46a4-9d07-d78a48643d5e	2026-04-03 07:24:43.064	2026-03-04 07:24:43.065053
f2ff2a15-14c3-4db0-af07-35f39ade8450	ca2f928c-0aa8-433a-8595-29e842b06f1d	8c3609eb-1ff5-47d4-803b-cc559f9d27eb	2026-04-03 09:38:12.209	2026-03-04 09:38:12.209258
05e4f8c7-5b64-4bd6-a47a-ac7146589e5c	1a3179cb-3356-4d36-a1c0-c45cb377f429	82e55e48-d090-4838-982f-3ad1027eec11	2026-04-03 11:02:10.82	2026-03-04 11:02:10.820588
\.


--
-- Data for Name: techniciens; Type: TABLE DATA; Schema: public; Owner: exhelia
--

COPY public.techniciens (id, user_id, nom, prenom, telephone, photo, actif, created_at, equipe_id) FROM stdin;
04f8aeff-a5c6-4771-9553-34f016eedea5	ae9d623c-3973-4884-ba81-a6ae428522bc	Lallongue	Johan 	07 55 61 61 73	\N	t	2026-03-04 10:56:02.131741	e035f0d8-06dd-46f4-8923-8d59e8789b2a
cb9e02d8-1699-4c84-bb21-3be3a98832e0	d91c4242-414f-4b17-896d-5ef8dc1fca33	Schumaraer	Michel	\N	\N	t	2026-03-04 07:21:32.173146	e035f0d8-06dd-46f4-8923-8d59e8789b2a
\.


--
-- Data for Name: users; Type: TABLE DATA; Schema: public; Owner: exhelia
--

COPY public.users (id, email, password, role, created_at, last_login, photo) FROM stdin;
ca2f928c-0aa8-433a-8595-29e842b06f1d	admin@exhelia.com	$2a$12$HRGE6TBDmMcNQRhlGFGFD.0bK6ZVj.HPlPMt/0Sfpjs89iBd8uT7i	admin	2026-03-04 07:01:45.907696	2026-03-04 09:38:12.21078	data:image/jpeg;base64,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AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA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XaINxp/X1+k1leELuaoaHo+1AgF57zX/AOtY/9oADAMBAAIAAwAAABDzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzznjzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzyL7zzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzz3T/nzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzx3/APE8888888888888888888888888888888888888888888888888888888888888888888888+9/hc8888888888888888888888888888888888888888888888888888888888888888888884d/408888888888888888888888888888888888888888888888888888888888888888888888p//O88888888888888888888888888888888888888888888888888888888888888888888888X/tf8888888888888888888888888888888888888888888888888888888888888888888888v/wDNPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPLvv8PPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPB/+H/PPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPnv8ATzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzxX+j/AM888888888888888888888888888888888888888888888888888888888888888888888q/wD3/PPPPPPPPPPPPPPPPPPLAPPPPbFPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPNv+fPPPPPPPPPPPPPPPPPPPPAPPPPv7PPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPKP+lPONPvu/PPPPPPPPPPPPPPAPPPPdLvPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPfP5vPjP/AP8An888888888888888A888888888888888888888888888w08888888888888888888w/+eo8//wD+v/PPPPPPPPPPPPPPAPPPPPPPPPPPPOPPPPPPPPPPPOPLPPDPPPMPHPPPOPOPPPPPOF/+b/u+v/5/PPPPOMHHPCMPPPPAPPPOAFPPPONLPPPOPPPPPPPPPOMDONLPPPNOPPPPONPPPPPJf/7/APdtf/xzzzzzzTiCwjzzTzzwDzzzwBTzzzjiwyjSzzzzzzzzzyzzzwjSzzwzwjyTzzzzzzzzT/8A/wB/bv8An3zzXzyzxzzzyzxzzzwDzzygATzzzxzzzyzyzzzzzzzTjTzzzzzjzyzjyDyTzzzzzy7/AP8A8HK/f1PPLfVvFLPPPPLFPPPPAPPPPAFPPPPPPPPPPOPPPPPPPLPPPPPHLHPPPPLOPPPPPPPDP/8A5/iX/DzzjfzbxzzzzzzzyjzzwDzzzwBTzzzzxTzzzzzzzzzzzTzDDDDDDDzzzjTyjzzzzzytz/p/yn/v/wA4M/N8808wwwwww0888A8888AU888o80UMs88888888088888888888k8c8o888888/wD3PPH/AOjzyz+p7zzyjzzzzzzzzzwBTzzwBTzzjSzzzzzz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
ae9d623c-3973-4884-ba81-a6ae428522bc	johan.lallongue@exhelia.com	$2a$12$Xiq6YCvDIYs6bASwzaB5b.33KfG5lhgbaGEN137HfwXzFsB1yeSlm	technicien	2026-03-04 10:56:02.130172	\N	\N
1a3179cb-3356-4d36-a1c0-c45cb377f429	pascal.devriendt@exhelia.com	$2a$12$QdE5SE4.ywB5H5zGoTzRXeq.q2ZOxZjOGZHKH/5IY3Ta80eBaV/du	bureau	2026-03-04 11:01:54.519969	2026-03-04 11:02:10.821516	\N
6ee5660b-be0f-402b-bcbc-0753f3452f23	courtois1772622244840@exhelia-client.fr	$2a$12$D30hzR.gBDHW9PTRGNpKb.22b7v7wwwQOmSylXW3x/P1ZhvSYL8le	particulier	2026-03-04 11:04:05.328782	\N	\N
681a48c7-10f3-4179-944a-bef20ce230ff	exhelia@exhelia.com	$2a$12$gYem/8Rd4EOsBaKxpTW.h.XtpkmF/aaKUGyZRp4egWuyV6apVaPqi	bailleur	2026-03-04 11:10:54.215243	\N	\N
444218be-bce3-4d72-8c5a-8f53d2cb2356	francis1772634030975@exhelia-client.fr	$2a$12$d7RjHT/WW9/5tgT3ACWPbOlpnnc1S8esRk.GFmjVs9c4K/W5RaMkq	particulier	2026-03-04 14:20:31.483271	\N	\N
d91c4242-414f-4b17-896d-5ef8dc1fca33	michel;schumarer@exhelia.com	$2a$12$vx90RvxkbPdoabP/RTVFquKdUHNEzdOI9BZIKOjv/j7mG7NJu/3Ri	technicien	2026-03-04 07:21:32.17113	\N	\N
e2ad5bec-96d3-45b5-a5c0-d2a41f667697	benoit.schmidlin@exhelia.com	$2a$12$QE88Gzq1QflKdHRVj2qMYu5rW4bO5ZB5e0W8/7Kpk7v/uYegDVeCW	bureau	2026-03-04 07:27:04.344341	\N	\N
\.


--
-- Name: mesures_id_seq; Type: SEQUENCE SET; Schema: public; Owner: exhelia
--

SELECT pg_catalog.setval('public.mesures_id_seq', 1, false);


--
-- Name: calculs_eco calculs_eco_pkey; Type: CONSTRAINT; Schema: public; Owner: exhelia
--

ALTER TABLE ONLY public.calculs_eco
    ADD CONSTRAINT calculs_eco_pkey PRIMARY KEY (id);


--
-- Name: capteurs capteurs_pkey; Type: CONSTRAINT; Schema: public; Owner: exhelia
--

ALTER TABLE ONLY public.capteurs
    ADD CONSTRAINT capteurs_pkey PRIMARY KEY (id);


--
-- Name: chefs_equipe chefs_equipe_pkey; Type: CONSTRAINT; Schema: public; Owner: exhelia
--

ALTER TABLE ONLY public.chefs_equipe
    ADD CONSTRAINT chefs_equipe_pkey PRIMARY KEY (id);


--
-- Name: clients clients_pkey; Type: CONSTRAINT; Schema: public; Owner: exhelia
--

ALTER TABLE ONLY public.clients
    ADD CONSTRAINT clients_pkey PRIMARY KEY (id);


--
-- Name: equipements equipements_pkey; Type: CONSTRAINT; Schema: public; Owner: exhelia
--

ALTER TABLE ONLY public.equipements
    ADD CONSTRAINT equipements_pkey PRIMARY KEY (id);


--
-- Name: equipes equipes_pkey; Type: CONSTRAINT; Schema: public; Owner: exhelia
--

ALTER TABLE ONLY public.equipes
    ADD CONSTRAINT equipes_pkey PRIMARY KEY (id);


--
-- Name: interventions interventions_pkey; Type: CONSTRAINT; Schema: public; Owner: exhelia
--

ALTER TABLE ONLY public.interventions
    ADD CONSTRAINT interventions_pkey PRIMARY KEY (id);


--
-- Name: logements logements_pkey; Type: CONSTRAINT; Schema: public; Owner: exhelia
--

ALTER TABLE ONLY public.logements
    ADD CONSTRAINT logements_pkey PRIMARY KEY (id);


--
-- Name: mesures mesures_pkey; Type: CONSTRAINT; Schema: public; Owner: exhelia
--

ALTER TABLE ONLY public.mesures
    ADD CONSTRAINT mesures_pkey PRIMARY KEY (id);


--
-- Name: rapport_champs rapport_champs_pkey; Type: CONSTRAINT; Schema: public; Owner: exhelia
--

ALTER TABLE ONLY public.rapport_champs
    ADD CONSTRAINT rapport_champs_pkey PRIMARY KEY (id);


--
-- Name: rapport_photos rapport_photos_pkey; Type: CONSTRAINT; Schema: public; Owner: exhelia
--

ALTER TABLE ONLY public.rapport_photos
    ADD CONSTRAINT rapport_photos_pkey PRIMARY KEY (id);


--
-- Name: rapport_signatures rapport_signatures_pkey; Type: CONSTRAINT; Schema: public; Owner: exhelia
--

ALTER TABLE ONLY public.rapport_signatures
    ADD CONSTRAINT rapport_signatures_pkey PRIMARY KEY (id);


--
-- Name: rapport_signatures rapport_signatures_rapport_id_key; Type: CONSTRAINT; Schema: public; Owner: exhelia
--

ALTER TABLE ONLY public.rapport_signatures
    ADD CONSTRAINT rapport_signatures_rapport_id_key UNIQUE (rapport_id);


--
-- Name: rapports rapports_intervention_id_key; Type: CONSTRAINT; Schema: public; Owner: exhelia
--

ALTER TABLE ONLY public.rapports
    ADD CONSTRAINT rapports_intervention_id_key UNIQUE (intervention_id);


--
-- Name: rapports rapports_pkey; Type: CONSTRAINT; Schema: public; Owner: exhelia
--

ALTER TABLE ONLY public.rapports
    ADD CONSTRAINT rapports_pkey PRIMARY KEY (id);


--
-- Name: refresh_tokens refresh_tokens_pkey; Type: CONSTRAINT; Schema: public; Owner: exhelia
--

ALTER TABLE ONLY public.refresh_tokens
    ADD CONSTRAINT refresh_tokens_pkey PRIMARY KEY (id);


--
-- Name: refresh_tokens refresh_tokens_token_key; Type: CONSTRAINT; Schema: public; Owner: exhelia
--

ALTER TABLE ONLY public.refresh_tokens
    ADD CONSTRAINT refresh_tokens_token_key UNIQUE (token);


--
-- Name: techniciens techniciens_pkey; Type: CONSTRAINT; Schema: public; Owner: exhelia
--

ALTER TABLE ONLY public.techniciens
    ADD CONSTRAINT techniciens_pkey PRIMARY KEY (id);


--
-- Name: users users_email_key; Type: CONSTRAINT; Schema: public; Owner: exhelia
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key UNIQUE (email);


--
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: exhelia
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- Name: idx_equipements_logement; Type: INDEX; Schema: public; Owner: exhelia
--

CREATE INDEX idx_equipements_logement ON public.equipements USING btree (logement_id);


--
-- Name: idx_equipements_type; Type: INDEX; Schema: public; Owner: exhelia
--

CREATE INDEX idx_equipements_type ON public.equipements USING btree (type);


--
-- Name: idx_interventions_date; Type: INDEX; Schema: public; Owner: exhelia
--

CREATE INDEX idx_interventions_date ON public.interventions USING btree (date_prevue);


--
-- Name: idx_interventions_fts; Type: INDEX; Schema: public; Owner: exhelia
--

CREATE INDEX idx_interventions_fts ON public.interventions USING gin (search_vector);


--
-- Name: idx_interventions_logement; Type: INDEX; Schema: public; Owner: exhelia
--

CREATE INDEX idx_interventions_logement ON public.interventions USING btree (logement_id);


--
-- Name: idx_interventions_statut; Type: INDEX; Schema: public; Owner: exhelia
--

CREATE INDEX idx_interventions_statut ON public.interventions USING btree (statut);


--
-- Name: idx_interventions_technicien; Type: INDEX; Schema: public; Owner: exhelia
--

CREATE INDEX idx_interventions_technicien ON public.interventions USING btree (technicien_id);


--
-- Name: idx_logements_client; Type: INDEX; Schema: public; Owner: exhelia
--

CREATE INDEX idx_logements_client ON public.logements USING btree (client_id);


--
-- Name: idx_logements_fts; Type: INDEX; Schema: public; Owner: exhelia
--

CREATE INDEX idx_logements_fts ON public.logements USING gin (search_vector);


--
-- Name: idx_logements_trgm; Type: INDEX; Schema: public; Owner: exhelia
--

CREATE INDEX idx_logements_trgm ON public.logements USING gin (adresse public.gin_trgm_ops);


--
-- Name: idx_mesures_capteur_time; Type: INDEX; Schema: public; Owner: exhelia
--

CREATE INDEX idx_mesures_capteur_time ON public.mesures USING btree (capteur_id, "timestamp" DESC);


--
-- Name: idx_photos_rapport; Type: INDEX; Schema: public; Owner: exhelia
--

CREATE INDEX idx_photos_rapport ON public.rapport_photos USING btree (rapport_id);


--
-- Name: idx_rapport_champs_rapport; Type: INDEX; Schema: public; Owner: exhelia
--

CREATE INDEX idx_rapport_champs_rapport ON public.rapport_champs USING btree (rapport_id);


--
-- Name: idx_rapports_intervention; Type: INDEX; Schema: public; Owner: exhelia
--

CREATE INDEX idx_rapports_intervention ON public.rapports USING btree (intervention_id);


--
-- Name: idx_rapports_technicien; Type: INDEX; Schema: public; Owner: exhelia
--

CREATE INDEX idx_rapports_technicien ON public.rapports USING btree (technicien_id);


--
-- Name: idx_recherche_globale_fts; Type: INDEX; Schema: public; Owner: exhelia
--

CREATE INDEX idx_recherche_globale_fts ON public.recherche_globale USING gin (search_vector);


--
-- Name: idx_refresh_tokens_token; Type: INDEX; Schema: public; Owner: exhelia
--

CREATE INDEX idx_refresh_tokens_token ON public.refresh_tokens USING btree (token);


--
-- Name: idx_refresh_tokens_user; Type: INDEX; Schema: public; Owner: exhelia
--

CREATE INDEX idx_refresh_tokens_user ON public.refresh_tokens USING btree (user_id);


--
-- Name: interventions interventions_search_trigger; Type: TRIGGER; Schema: public; Owner: exhelia
--

CREATE TRIGGER interventions_search_trigger BEFORE INSERT OR UPDATE ON public.interventions FOR EACH ROW EXECUTE FUNCTION public.interventions_search_update();


--
-- Name: logements logements_search_trigger; Type: TRIGGER; Schema: public; Owner: exhelia
--

CREATE TRIGGER logements_search_trigger BEFORE INSERT OR UPDATE ON public.logements FOR EACH ROW EXECUTE FUNCTION public.logements_search_update();


--
-- Name: calculs_eco calculs_eco_equipement_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: exhelia
--

ALTER TABLE ONLY public.calculs_eco
    ADD CONSTRAINT calculs_eco_equipement_id_fkey FOREIGN KEY (equipement_id) REFERENCES public.equipements(id) ON DELETE CASCADE;


--
-- Name: capteurs capteurs_equipement_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: exhelia
--

ALTER TABLE ONLY public.capteurs
    ADD CONSTRAINT capteurs_equipement_id_fkey FOREIGN KEY (equipement_id) REFERENCES public.equipements(id) ON DELETE CASCADE;


--
-- Name: chefs_equipe chefs_equipe_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: exhelia
--

ALTER TABLE ONLY public.chefs_equipe
    ADD CONSTRAINT chefs_equipe_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: clients clients_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: exhelia
--

ALTER TABLE ONLY public.clients
    ADD CONSTRAINT clients_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: equipements equipements_logement_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: exhelia
--

ALTER TABLE ONLY public.equipements
    ADD CONSTRAINT equipements_logement_id_fkey FOREIGN KEY (logement_id) REFERENCES public.logements(id) ON DELETE CASCADE;


--
-- Name: equipes equipes_chef_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: exhelia
--

ALTER TABLE ONLY public.equipes
    ADD CONSTRAINT equipes_chef_id_fkey FOREIGN KEY (chef_id) REFERENCES public.chefs_equipe(id) ON DELETE CASCADE;


--
-- Name: interventions interventions_chef_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: exhelia
--

ALTER TABLE ONLY public.interventions
    ADD CONSTRAINT interventions_chef_id_fkey FOREIGN KEY (chef_id) REFERENCES public.chefs_equipe(id) ON DELETE SET NULL;


--
-- Name: interventions interventions_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: exhelia
--

ALTER TABLE ONLY public.interventions
    ADD CONSTRAINT interventions_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.chefs_equipe(id) ON DELETE SET NULL;


--
-- Name: interventions interventions_equipement_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: exhelia
--

ALTER TABLE ONLY public.interventions
    ADD CONSTRAINT interventions_equipement_id_fkey FOREIGN KEY (equipement_id) REFERENCES public.equipements(id) ON DELETE SET NULL;


--
-- Name: interventions interventions_logement_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: exhelia
--

ALTER TABLE ONLY public.interventions
    ADD CONSTRAINT interventions_logement_id_fkey FOREIGN KEY (logement_id) REFERENCES public.logements(id) ON DELETE RESTRICT;


--
-- Name: interventions interventions_technicien_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: exhelia
--

ALTER TABLE ONLY public.interventions
    ADD CONSTRAINT interventions_technicien_id_fkey FOREIGN KEY (technicien_id) REFERENCES public.techniciens(id) ON DELETE SET NULL;


--
-- Name: logements logements_client_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: exhelia
--

ALTER TABLE ONLY public.logements
    ADD CONSTRAINT logements_client_id_fkey FOREIGN KEY (client_id) REFERENCES public.clients(id) ON DELETE CASCADE;


--
-- Name: mesures mesures_capteur_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: exhelia
--

ALTER TABLE ONLY public.mesures
    ADD CONSTRAINT mesures_capteur_id_fkey FOREIGN KEY (capteur_id) REFERENCES public.capteurs(id) ON DELETE CASCADE;


--
-- Name: rapport_champs rapport_champs_rapport_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: exhelia
--

ALTER TABLE ONLY public.rapport_champs
    ADD CONSTRAINT rapport_champs_rapport_id_fkey FOREIGN KEY (rapport_id) REFERENCES public.rapports(id) ON DELETE CASCADE;


--
-- Name: rapport_photos rapport_photos_rapport_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: exhelia
--

ALTER TABLE ONLY public.rapport_photos
    ADD CONSTRAINT rapport_photos_rapport_id_fkey FOREIGN KEY (rapport_id) REFERENCES public.rapports(id) ON DELETE CASCADE;


--
-- Name: rapport_signatures rapport_signatures_rapport_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: exhelia
--

ALTER TABLE ONLY public.rapport_signatures
    ADD CONSTRAINT rapport_signatures_rapport_id_fkey FOREIGN KEY (rapport_id) REFERENCES public.rapports(id) ON DELETE CASCADE;


--
-- Name: rapports rapports_intervention_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: exhelia
--

ALTER TABLE ONLY public.rapports
    ADD CONSTRAINT rapports_intervention_id_fkey FOREIGN KEY (intervention_id) REFERENCES public.interventions(id) ON DELETE RESTRICT;


--
-- Name: rapports rapports_technicien_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: exhelia
--

ALTER TABLE ONLY public.rapports
    ADD CONSTRAINT rapports_technicien_id_fkey FOREIGN KEY (technicien_id) REFERENCES public.techniciens(id) ON DELETE SET NULL;


--
-- Name: refresh_tokens refresh_tokens_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: exhelia
--

ALTER TABLE ONLY public.refresh_tokens
    ADD CONSTRAINT refresh_tokens_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: techniciens techniciens_equipe_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: exhelia
--

ALTER TABLE ONLY public.techniciens
    ADD CONSTRAINT techniciens_equipe_id_fkey FOREIGN KEY (equipe_id) REFERENCES public.equipes(id) ON DELETE SET NULL;


--
-- Name: techniciens techniciens_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: exhelia
--

ALTER TABLE ONLY public.techniciens
    ADD CONSTRAINT techniciens_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: SCHEMA public; Type: ACL; Schema: -; Owner: pg_database_owner
--

GRANT ALL ON SCHEMA public TO exhelia;


--
-- Name: recherche_globale; Type: MATERIALIZED VIEW DATA; Schema: public; Owner: exhelia
--

REFRESH MATERIALIZED VIEW public.recherche_globale;


--
-- PostgreSQL database dump complete
--

\unrestrict YNZFYbnKyu7ErZThH9xYekHFZAQAaLVcody8mJTtDPWI6YmhSmmWfdAIMN5v2VF

