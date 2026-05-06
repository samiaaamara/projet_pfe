-- phpMyAdmin SQL Dump
-- version 5.2.1
-- https://www.phpmyadmin.net/
--
-- Host: 127.0.0.1
-- Generation Time: May 06, 2026 at 07:46 PM
-- Server version: 10.4.32-MariaDB
-- PHP Version: 8.0.30

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

--
-- Database: `gestion_formations`
--

-- --------------------------------------------------------

--
-- Table structure for table `admins`
--

CREATE TABLE `admins` (
  `id` int(11) NOT NULL,
  `user_id` int(11) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `admins`
--

INSERT INTO `admins` (`id`, `user_id`) VALUES
(1, 1);

-- --------------------------------------------------------

--
-- Table structure for table `etudiants`
--

CREATE TABLE `etudiants` (
  `id` int(11) NOT NULL,
  `user_id` int(11) NOT NULL,
  `progression` int(11) DEFAULT 0,
  `niveau` varchar(50) DEFAULT NULL,
  `specialite` varchar(100) DEFAULT NULL,
  `cin` varchar(20) DEFAULT NULL,
  `telephone` varchar(20) DEFAULT NULL,
  `date_naissance` date DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `etudiants`
--

INSERT INTO `etudiants` (`id`, `user_id`, `progression`, `niveau`, `specialite`, `cin`, `telephone`, `date_naissance`) VALUES
(1, 9, 0, NULL, NULL, NULL, NULL, NULL),
(2, 13, 0, NULL, NULL, NULL, NULL, NULL),
(3, 15, 0, NULL, NULL, NULL, NULL, NULL),
(4, 18, 0, NULL, NULL, NULL, NULL, NULL),
(5, 20, 0, NULL, NULL, NULL, NULL, NULL),
(6, 34, 0, NULL, NULL, NULL, NULL, NULL),
(7, 38, 0, 'L3', 'Developement web', '13039306', NULL, NULL),
(8, 43, 0, 'M1', 'finance', '13306405', '29800945', '2004-01-01');

-- --------------------------------------------------------

--
-- Table structure for table `externes`
--

CREATE TABLE `externes` (
  `id` int(11) NOT NULL,
  `user_id` int(11) NOT NULL,
  `telephone` varchar(20) DEFAULT NULL,
  `entreprise` varchar(150) DEFAULT NULL,
  `specialite` varchar(150) DEFAULT NULL,
  `date_naissance` date DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `externes`
--

INSERT INTO `externes` (`id`, `user_id`, `telephone`, `entreprise`, `specialite`, `date_naissance`) VALUES
(1, 40, '+21629800945', 'iset', NULL, NULL),
(2, 41, '+21629800945', 'iset', 'finance', '1996-01-01');

-- --------------------------------------------------------

--
-- Table structure for table `formateurs`
--

CREATE TABLE `formateurs` (
  `id` int(11) NOT NULL,
  `user_id` int(11) NOT NULL,
  `specialite` varchar(100) DEFAULT NULL,
  `telephone` varchar(20) DEFAULT NULL,
  `date_naissance` date DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `formateurs`
--

INSERT INTO `formateurs` (`id`, `user_id`, `specialite`, `telephone`, `date_naissance`) VALUES
(2, 3, 'Développement Web', NULL, NULL),
(3, 35, 'Angular', NULL, NULL),
(4, 37, 'Spring Boot', NULL, NULL),
(5, 44, 'Genie mecanique', NULL, NULL);

-- --------------------------------------------------------

--
-- Table structure for table `formations`
--

CREATE TABLE `formations` (
  `id` int(11) NOT NULL,
  `titre` varchar(150) NOT NULL,
  `description` text DEFAULT NULL,
  `date_debut` date DEFAULT NULL,
  `formateur_id` int(11) NOT NULL,
  `specialite` varchar(100) DEFAULT NULL,
  `status` varchar(20) DEFAULT 'draft',
  `date_fin` date DEFAULT NULL,
  `duree` int(11) DEFAULT NULL,
  `nb_places` int(11) DEFAULT NULL,
  `prix` decimal(10,2) DEFAULT 0.00
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `formations`
--

INSERT INTO `formations` (`id`, `titre`, `description`, `date_debut`, `formateur_id`, `specialite`, `status`, `date_fin`, `duree`, `nb_places`, `prix`) VALUES
(13, 'Introduction à Django', 'Apprendre à créer une application web avec Django et MySQL', '2026-05-15', 3, 'Informatique', 'published', '2026-05-25', 40, 15, 0.00),
(16, 'Développement Web Full Stack', 'Formation complète pour apprendre à créer des applications web modernes avec HTML, CSS, JavaScript, Angular et Node.js.', '2026-05-10', 3, 'Informatique', 'published', '2026-05-30', 40, 25, 0.00),
(20, 'Créer des API avec FastAPI', 'Apprendre à créer des API performantes avec FastAPI, gestion des routes, validation des données, authentification et connexion à PostgreSQL.', '2026-06-12', 3, 'Informatique', 'published', '2026-06-28', 30, 10, 129.97),
(21, 'Introduction au Génie Mécanique Industriel', 'Cette formation en génie mécanique permet aux apprenants de comprendre les principes fondamentaux de la mécanique appliquée dans l’industrie. Elle couvre l’étude des systèmes mécaniques, la résistance des matériaux, la conception assistée par ordinateur (CAO) et les bases de la fabrication industrielle.\n\nLes participants développeront des compétences pratiques pour analyser, concevoir et optimiser des systèmes mécaniques utilisés dans différents secteurs industriels.\n\nLa formation inclut des exemples concrets, des études de cas et un projet pratique en fin de parcours.', '2026-06-05', 5, 'Mécanique', 'published', '2026-06-10', 20, 10, 0.00);

-- --------------------------------------------------------

--
-- Table structure for table `inscriptions`
--

CREATE TABLE `inscriptions` (
  `id` int(11) NOT NULL,
  `etudiant_id` int(11) NOT NULL,
  `formation_id` int(11) NOT NULL,
  `date_inscription` date DEFAULT curdate(),
  `statut` varchar(50) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `inscriptions`
--

INSERT INTO `inscriptions` (`id`, `etudiant_id`, `formation_id`, `date_inscription`, `statut`) VALUES
(14, 6, 13, '2026-04-25', 'présent'),
(18, 6, 16, '2026-04-29', 'absent'),
(23, 8, 16, '2026-05-04', 'absent'),
(24, 8, 20, '2026-05-05', 'Inscrit');

-- --------------------------------------------------------

--
-- Table structure for table `inscriptions_externes`
--

CREATE TABLE `inscriptions_externes` (
  `id` int(11) NOT NULL,
  `externe_id` int(11) NOT NULL,
  `formation_id` int(11) NOT NULL,
  `montant` decimal(10,2) NOT NULL DEFAULT 0.00,
  `statut_paiement` enum('en_attente','payé','remboursé') DEFAULT 'en_attente',
  `statut_inscription` enum('en_attente','confirmé','annulé') DEFAULT 'en_attente',
  `date_inscription` datetime DEFAULT current_timestamp(),
  `date_paiement` datetime DEFAULT NULL,
  `payment_ref` varchar(100) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `inscriptions_externes`
--

INSERT INTO `inscriptions_externes` (`id`, `externe_id`, `formation_id`, `montant`, `statut_paiement`, `statut_inscription`, `date_inscription`, `date_paiement`, `payment_ref`) VALUES
(2, 2, 13, 0.00, 'payé', 'confirmé', '2026-04-29 11:11:37', '2026-04-29 11:11:37', NULL);

-- --------------------------------------------------------

--
-- Table structure for table `messages`
--

CREATE TABLE `messages` (
  `id` int(11) NOT NULL,
  `expediteur_id` int(11) NOT NULL,
  `destinataire_id` int(11) NOT NULL,
  `contenu` text NOT NULL,
  `lu` tinyint(1) DEFAULT 0,
  `date_envoi` datetime DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `messages`
--

INSERT INTO `messages` (`id`, `expediteur_id`, `destinataire_id`, `contenu`, `lu`, `date_envoi`) VALUES
(2, 35, 34, 'bonjour', 1, '2026-04-25 20:26:27'),
(3, 34, 35, 'bonjour', 1, '2026-04-25 20:26:55'),
(4, 34, 35, 'salut', 1, '2026-04-27 13:08:44'),
(5, 43, 35, 'bonjour', 1, '2026-05-03 15:52:28'),
(6, 41, 35, 'salut', 1, '2026-05-03 16:08:07'),
(7, 36, 35, 'salut', 1, '2026-05-04 12:22:47');

-- --------------------------------------------------------

--
-- Table structure for table `modules_formation`
--

CREATE TABLE `modules_formation` (
  `id` int(11) NOT NULL,
  `formation_id` int(11) NOT NULL,
  `titre` varchar(200) NOT NULL,
  `description` text DEFAULT NULL,
  `duree_heures` decimal(5,2) DEFAULT NULL,
  `ordre` int(11) DEFAULT 0
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `modules_formation`
--

INSERT INTO `modules_formation` (`id`, `formation_id`, `titre`, `description`, `duree_heures`, `ordre`) VALUES
(1, 20, 'Introduction à FastAPI', 'Présentation de FastAPI, installation, structure d’un projet, première API simple.', 3.00, 1);

-- --------------------------------------------------------

--
-- Table structure for table `notations`
--

CREATE TABLE `notations` (
  `id` int(11) NOT NULL,
  `etudiant_id` int(11) NOT NULL,
  `formation_id` int(11) NOT NULL,
  `note` tinyint(4) NOT NULL,
  `commentaire` text DEFAULT NULL,
  `date_notation` datetime DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `notations`
--

INSERT INTO `notations` (`id`, `etudiant_id`, `formation_id`, `note`, `commentaire`, `date_notation`) VALUES
(1, 6, 13, 1, NULL, '2026-04-25 04:36:10'),
(3, 8, 16, 4, NULL, '2026-05-04 12:26:58');

-- --------------------------------------------------------

--
-- Table structure for table `notifications`
--

CREATE TABLE `notifications` (
  `id` int(11) NOT NULL,
  `user_id` int(11) NOT NULL,
  `message` text NOT NULL,
  `type` varchar(50) DEFAULT 'info',
  `lu` tinyint(1) DEFAULT 0,
  `date_creation` datetime DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `notifications`
--

INSERT INTO `notifications` (`id`, `user_id`, `message`, `type`, `lu`, `date_creation`) VALUES
(2, 41, 'Inscription confirmée pour la formation \"Node.js\" ✅', 'approbation', 1, '2026-04-28 15:04:52'),
(3, 35, '📚 samiaa amara s\'est inscrit à votre formation « angular »', 'inscription', 1, '2026-04-29 11:10:18'),
(5, 41, 'Inscription confirmée pour la formation \"Introduction à Django\" ✅', 'approbation', 1, '2026-04-29 11:11:37'),
(6, 41, 'Inscription confirmée pour la formation \"angular\" ✅', 'approbation', 1, '2026-04-29 11:12:07'),
(7, 36, '🔔 Nouvelle formation en attente d\'approbation : « Développement Web Full Stack »', 'approbation', 0, '2026-04-29 14:21:28'),
(8, 35, '❌ Votre formation « Développement Web Full Stack » a été rejetée. Raison : Non spécifiée', 'rejet', 1, '2026-04-29 15:19:52'),
(9, 36, '🔔 Nouvelle formation en attente d\'approbation : « Développement Web Full Stack »', 'approbation', 0, '2026-04-29 15:20:17'),
(10, 35, '✅ Votre formation « Développement Web Full Stack » a été acceptée par l\'administrateur. Elle sera publiée prochainement.', 'approbation', 1, '2026-04-29 19:46:21'),
(11, 35, '🚀 Votre formation « Développement Web Full Stack » est maintenant publiée dans le catalogue !', 'publication', 1, '2026-04-29 19:47:59'),
(12, 35, '📚 samiaa amara s\'est inscrit à votre formation « Développement Web Full Stack »', 'inscription', 1, '2026-04-29 19:49:06'),
(14, 36, '🔔 Nouvelle formation en attente d\'approbation : « fvdcc »', 'approbation', 0, '2026-04-30 01:07:20'),
(15, 35, '✅ Votre formation « fvdcc » a été acceptée par l\'administrateur. Elle sera publiée prochainement.', 'approbation', 1, '2026-04-30 01:23:07'),
(16, 35, '📚 firas amara s\'est inscrit à votre formation « angular »', 'inscription', 1, '2026-04-30 13:57:16'),
(17, 35, '📚 firas amara s\'est inscrit à votre formation « dcvf »', 'inscription', 1, '2026-05-03 13:52:11'),
(18, 41, 'Inscription confirmée pour la formation \"dcvf\" ✅', 'approbation', 1, '2026-05-03 13:52:26'),
(19, 35, '📚 firas amara s\'est inscrit à votre formation « fcggvb »', 'inscription', 1, '2026-05-03 15:36:57'),
(20, 35, '🚀 Votre formation « fvdcc » est maintenant publiée dans le catalogue !', 'publication', 1, '2026-05-04 12:22:11'),
(23, 34, '🏆 Votre présence à la formation « Développement Web Full Stack » a été validée !', 'presence', 1, '2026-05-05 14:06:19'),
(24, 43, '🏆 Votre présence à la formation « Développement Web Full Stack » a été validée !', 'presence', 1, '2026-05-05 18:53:25'),
(25, 36, '🔔 Nouvelle formation en attente d\'approbation : « Introduction au Génie Mécanique Industriel »', 'approbation', 0, '2026-05-05 19:19:39'),
(26, 44, '✅ Votre formation « Introduction au Génie Mécanique Industriel » a été acceptée par l\'administrateur. Elle sera publiée prochainement.', 'approbation', 0, '2026-05-05 19:21:50'),
(27, 44, '🚀 Votre formation « Introduction au Génie Mécanique Industriel » est maintenant publiée dans le catalogue !', 'publication', 0, '2026-05-05 19:47:23'),
(28, 43, '🎓 Félicitations ! Vous avez complété 100% de la formation \"Créer des API avec FastAPI\" !', 'approbation', 1, '2026-05-06 17:50:20'),
(29, 43, '🎓 Félicitations ! Vous avez complété 100% de la formation \"Créer des API avec FastAPI\" !', 'approbation', 0, '2026-05-06 17:50:36'),
(30, 34, '📋 Votre absence à la formation « Développement Web Full Stack » a été enregistrée.', 'presence', 1, '2026-05-06 17:51:03'),
(31, 43, '📋 Votre absence à la formation « Développement Web Full Stack » a été enregistrée.', 'presence', 0, '2026-05-06 17:51:06'),
(32, 43, '⚠️ Votre taux de présence pour « Développement Web Full Stack » est de 0%. Un taux minimum de 75% est requis.', 'presence', 1, '2026-05-06 17:51:32'),
(33, 43, '⚠️ Votre taux de présence pour « Développement Web Full Stack » est de 0%. Un taux minimum de 75% est requis.', 'presence', 1, '2026-05-06 17:51:33'),
(34, 34, '🏆 Votre présence à la formation « Développement Web Full Stack » a été validée !', 'presence', 1, '2026-05-06 17:52:05'),
(35, 34, '📋 Votre absence à la formation « Développement Web Full Stack » a été enregistrée.', 'presence', 1, '2026-05-06 17:52:06');

-- --------------------------------------------------------

--
-- Table structure for table `presences`
--

CREATE TABLE `presences` (
  `id` int(11) NOT NULL,
  `seance_id` int(11) NOT NULL,
  `etudiant_id` int(11) NOT NULL,
  `statut` enum('présent','absent','retard','excusé') NOT NULL DEFAULT 'absent'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `presences`
--

INSERT INTO `presences` (`id`, `seance_id`, `etudiant_id`, `statut`) VALUES
(1, 2, 8, 'présent'),
(4, 2, 6, 'présent');

-- --------------------------------------------------------

--
-- Table structure for table `programme_formations`
--

CREATE TABLE `programme_formations` (
  `id` int(11) NOT NULL,
  `formation_id` int(11) NOT NULL,
  `description_globale` text DEFAULT NULL,
  `objectifs` text DEFAULT NULL,
  `prerequis` text DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `programme_formations`
--

INSERT INTO `programme_formations` (`id`, `formation_id`, `description_globale`, `objectifs`, `prerequis`) VALUES
(1, 20, 'Cette formation en développement web Full Stack permet aux apprenants d’acquérir les compétences nécessaires pour concevoir, développer et déployer des applications web complètes. Elle couvre à la fois le développement frontend (interfaces utilisateur) et backend (logique serveur, API, base de données).\n\nLes participants apprendront à utiliser des technologies modernes telles que HTML, CSS, JavaScript, Angular, Node.js et MySQL.', 'À la fin de cette formation, les apprenants seront capables de :\n\n- Créer une API REST avec FastAPI\n- Définir et gérer des routes (GET, POST, PUT, DELETE)\n- Valider les données باستخدام Pydantic\n- Connecter une API à une base de données (PostgreSQL / MySQL)\n- Implémenter un système d’authentification (JWT)\n- Tester et documenter automatiquement une API\n- Déployer une API en production', '- Connaissances de base en Python\n- Notions de programmation\n- Compréhension basique du web (client / serveur)\n- Motivation à apprendre le développement backend');

-- --------------------------------------------------------

--
-- Table structure for table `progression_etudiants`
--

CREATE TABLE `progression_etudiants` (
  `id` int(11) NOT NULL,
  `etudiant_id` int(11) NOT NULL,
  `formation_id` int(11) NOT NULL,
  `module_id` int(11) NOT NULL,
  `statut` enum('non_commence','en_cours','termine') NOT NULL DEFAULT 'non_commence',
  `date_maj` datetime DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `progression_etudiants`
--

INSERT INTO `progression_etudiants` (`id`, `etudiant_id`, `formation_id`, `module_id`, `statut`, `date_maj`) VALUES
(1, 8, 20, 1, 'termine', '2026-05-06 17:50:36');

-- --------------------------------------------------------

--
-- Table structure for table `questions`
--

CREATE TABLE `questions` (
  `id` int(11) NOT NULL,
  `formation_id` int(11) NOT NULL,
  `etudiant_id` int(11) NOT NULL,
  `question` text NOT NULL,
  `reponse` text DEFAULT NULL,
  `date_question` datetime DEFAULT current_timestamp(),
  `date_reponse` datetime DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `seances`
--

CREATE TABLE `seances` (
  `id` int(11) NOT NULL,
  `formation_id` int(11) NOT NULL,
  `date_seance` date NOT NULL,
  `heure_debut` time NOT NULL,
  `heure_fin` time NOT NULL,
  `salle` varchar(100) DEFAULT NULL,
  `statut` enum('planifiée','en_cours','terminée') NOT NULL DEFAULT 'planifiée'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `seances`
--

INSERT INTO `seances` (`id`, `formation_id`, `date_seance`, `heure_debut`, `heure_fin`, `salle`, `statut`) VALUES
(2, 16, '2026-06-06', '10:00:00', '13:00:00', 'a12', 'planifiée'),
(3, 21, '2026-06-05', '10:00:00', '13:00:00', 'A12', 'planifiée'),
(4, 21, '2026-06-06', '10:00:00', '13:00:00', 'A12', 'planifiée');

-- --------------------------------------------------------

--
-- Table structure for table `supports`
--

CREATE TABLE `supports` (
  `id` int(11) NOT NULL,
  `type` varchar(50) DEFAULT NULL,
  `fichier` varchar(255) DEFAULT NULL,
  `formation_id` int(11) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `users`
--

CREATE TABLE `users` (
  `id` int(11) NOT NULL,
  `nom` varchar(100) NOT NULL,
  `email` varchar(150) NOT NULL,
  `mot_de_passe` varchar(255) NOT NULL,
  `role` enum('etudiant','formateur','admin','externe') NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `users`
--

INSERT INTO `users` (`id`, `nom`, `email`, `mot_de_passe`, `role`) VALUES
(1, '', '', '', 'formateur'),
(2, 'amara samiaa', 'samiaa.amara@gmail.com', 'samiaa321', 'etudiant'),
(3, 'ranim jemai', 'ranimjemai@gmail.com', 'ranim321', 'formateur'),
(4, 'ghraba eya', 'ghrabaeya@gmail.com', '$2b$10$bIKhNi/Zq9pAopx7GP/dkOgR9tyUDBj1VHSYMCghBBFGsgZlHp9X2', 'etudiant'),
(9, 'medamara', 'medamara@gmail.com', '$2b$10$Qtz3R13qwZErKhez/NNKIe3dZtT0gFOoAkQaGUlGxXNvqKwqVo5P6', 'etudiant'),
(13, '', 'teacher@iset.tn', '$2b$10$.g7F/aThubSrN1gFdvpslOpjKBpMjW3jWI3kZ1kPeSd1rux8cgH8C', 'etudiant'),
(15, 'samiaa amara', 'samiaa.amara50@gmail.com', '$2b$10$jBdJewEGM2jScPeBYOt0veK9k8lWFBcPsSyZohWwBys2Oz3Cmnkly', 'etudiant'),
(18, 'amel derouich ', 'derouichamel@gmail.com', '$2b$10$ctsM1goqLDnRvSJA8abK0O/SrdcaN7i4himYysneyU2OtaD0MWgR.', 'etudiant'),
(20, 'samiaa amara', 'samiaa.amara50', '$2b$10$GZHya0eU1v1yIlEJ6Z89Yuz41BTN5iTlKXdlUI4p2kGoQgNuDSJau', 'etudiant'),
(34, 'samiaa amara', 'samiaa.amara11@gmail.com', '$2b$10$I4KYZLVCBmQy1ZskpS15NuleF5tKA4Zos9JdSrpnbPVx16ViZGc12', 'etudiant'),
(35, 'sabeh jari', 'sabehjari44@gmail.com', '$2b$10$SqoKOBceZZGktZEMI8s7Ce2SXwwPZtwCW955xJJXKjKznXGARVq6W', 'formateur'),
(36, 'Admin', 'admin@gmail.com', '$2b$10$MNETw.gLMhww7556DEt6t.jHivP97u59eYc12z7VVdxk6nzdM9HTu', 'admin'),
(37, 'formateur', 'formateur55@gmail.com', '$2b$10$YysxzCqYtBqvsQ0/tivsveW2cC21CYGhS32TCPXE8sIl6gZhkaM6C', 'formateur'),
(38, 'samiaa amara', 'samiaa.amara44', '$2b$10$6Vl4SQ4QUsrLfSpAvYmIdua7VsQpPSAuRpt/qW0nev1IsYEcVuKEy', 'etudiant'),
(39, 'samiaa amara', 'samiaa.amara441@gmail.com', '$2b$10$Dwc0SqVK/gqDmNOnYPqpwOOpr339B1bIPIzn47lz366LCvidSiBwi', 'etudiant'),
(40, 'amel derouich ', 'amelderouich@gmail.com', '$2b$10$a0w7xqgRG9HOeJiNMR3B/.2HVKaUSBSpnWbOfVJq66nj1.l8OVPiG', 'externe'),
(41, 'amel derouich ', 'amel12@gmail.com', '$2b$10$gVJKdObQAKABzJpXGjUzBO2WdSfD0IQ5NO0mW96sELRPrff85Yo0G', 'externe'),
(42, 'firas amara', 'firasamara@gmail.com', '$2b$10$VZDb0b4GoNFIGG3WHLEXk.TcxG0vyxEOyk1Hr4d5YyUqcbWWmDUi6', 'etudiant'),
(43, 'firas amara', 'firasamara11@gmail.com', '$2b$10$uneDV1go3wKYMJOGnYOfUu2KfADLrzlET/dGLeDSOyEnREwFNuCfO', 'etudiant'),
(44, 'med amara', 'medamara11@gmail.com', '$2b$10$jOs1jr89FPvz5pzD7P/W4eiwRmW8JXGfqcCr.xGwtNqP2Bi4K/EnC', 'formateur');

--
-- Indexes for dumped tables
--

--
-- Indexes for table `admins`
--
ALTER TABLE `admins`
  ADD PRIMARY KEY (`id`),
  ADD KEY `user_id` (`user_id`);

--
-- Indexes for table `etudiants`
--
ALTER TABLE `etudiants`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `cin` (`cin`),
  ADD KEY `user_id` (`user_id`);

--
-- Indexes for table `externes`
--
ALTER TABLE `externes`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `user_id` (`user_id`);

--
-- Indexes for table `formateurs`
--
ALTER TABLE `formateurs`
  ADD PRIMARY KEY (`id`),
  ADD KEY `user_id` (`user_id`);

--
-- Indexes for table `formations`
--
ALTER TABLE `formations`
  ADD PRIMARY KEY (`id`),
  ADD KEY `formateur_id` (`formateur_id`);

--
-- Indexes for table `inscriptions`
--
ALTER TABLE `inscriptions`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `etudiant_id` (`etudiant_id`,`formation_id`),
  ADD KEY `formation_id` (`formation_id`);

--
-- Indexes for table `inscriptions_externes`
--
ALTER TABLE `inscriptions_externes`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `unique_externe_formation` (`externe_id`,`formation_id`),
  ADD KEY `formation_id` (`formation_id`);

--
-- Indexes for table `messages`
--
ALTER TABLE `messages`
  ADD PRIMARY KEY (`id`),
  ADD KEY `expediteur_id` (`expediteur_id`),
  ADD KEY `destinataire_id` (`destinataire_id`);

--
-- Indexes for table `modules_formation`
--
ALTER TABLE `modules_formation`
  ADD PRIMARY KEY (`id`),
  ADD KEY `formation_id` (`formation_id`);

--
-- Indexes for table `notations`
--
ALTER TABLE `notations`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `unique_notation` (`etudiant_id`,`formation_id`),
  ADD KEY `formation_id` (`formation_id`);

--
-- Indexes for table `notifications`
--
ALTER TABLE `notifications`
  ADD PRIMARY KEY (`id`),
  ADD KEY `user_id` (`user_id`);

--
-- Indexes for table `presences`
--
ALTER TABLE `presences`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `uq_presence` (`seance_id`,`etudiant_id`),
  ADD KEY `etudiant_id` (`etudiant_id`);

--
-- Indexes for table `programme_formations`
--
ALTER TABLE `programme_formations`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `uq_prog_formation` (`formation_id`);

--
-- Indexes for table `progression_etudiants`
--
ALTER TABLE `progression_etudiants`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `uq_prog` (`etudiant_id`,`formation_id`,`module_id`),
  ADD KEY `formation_id` (`formation_id`),
  ADD KEY `module_id` (`module_id`);

--
-- Indexes for table `questions`
--
ALTER TABLE `questions`
  ADD PRIMARY KEY (`id`),
  ADD KEY `formation_id` (`formation_id`),
  ADD KEY `etudiant_id` (`etudiant_id`);

--
-- Indexes for table `seances`
--
ALTER TABLE `seances`
  ADD PRIMARY KEY (`id`),
  ADD KEY `formation_id` (`formation_id`);

--
-- Indexes for table `supports`
--
ALTER TABLE `supports`
  ADD PRIMARY KEY (`id`),
  ADD KEY `formation_id` (`formation_id`);

--
-- Indexes for table `users`
--
ALTER TABLE `users`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `email` (`email`);

--
-- AUTO_INCREMENT for dumped tables
--

--
-- AUTO_INCREMENT for table `admins`
--
ALTER TABLE `admins`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=2;

--
-- AUTO_INCREMENT for table `etudiants`
--
ALTER TABLE `etudiants`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=9;

--
-- AUTO_INCREMENT for table `externes`
--
ALTER TABLE `externes`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=3;

--
-- AUTO_INCREMENT for table `formateurs`
--
ALTER TABLE `formateurs`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=6;

--
-- AUTO_INCREMENT for table `formations`
--
ALTER TABLE `formations`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=22;

--
-- AUTO_INCREMENT for table `inscriptions`
--
ALTER TABLE `inscriptions`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=25;

--
-- AUTO_INCREMENT for table `inscriptions_externes`
--
ALTER TABLE `inscriptions_externes`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=6;

--
-- AUTO_INCREMENT for table `messages`
--
ALTER TABLE `messages`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=8;

--
-- AUTO_INCREMENT for table `modules_formation`
--
ALTER TABLE `modules_formation`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=2;

--
-- AUTO_INCREMENT for table `notations`
--
ALTER TABLE `notations`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=4;

--
-- AUTO_INCREMENT for table `notifications`
--
ALTER TABLE `notifications`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=36;

--
-- AUTO_INCREMENT for table `presences`
--
ALTER TABLE `presences`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=5;

--
-- AUTO_INCREMENT for table `programme_formations`
--
ALTER TABLE `programme_formations`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=2;

--
-- AUTO_INCREMENT for table `progression_etudiants`
--
ALTER TABLE `progression_etudiants`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=7;

--
-- AUTO_INCREMENT for table `questions`
--
ALTER TABLE `questions`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `seances`
--
ALTER TABLE `seances`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=5;

--
-- AUTO_INCREMENT for table `supports`
--
ALTER TABLE `supports`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=3;

--
-- AUTO_INCREMENT for table `users`
--
ALTER TABLE `users`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=45;

--
-- Constraints for dumped tables
--

--
-- Constraints for table `admins`
--
ALTER TABLE `admins`
  ADD CONSTRAINT `admins_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `etudiants`
--
ALTER TABLE `etudiants`
  ADD CONSTRAINT `etudiants_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `externes`
--
ALTER TABLE `externes`
  ADD CONSTRAINT `externes_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `formateurs`
--
ALTER TABLE `formateurs`
  ADD CONSTRAINT `formateurs_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `formations`
--
ALTER TABLE `formations`
  ADD CONSTRAINT `formations_ibfk_1` FOREIGN KEY (`formateur_id`) REFERENCES `formateurs` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `inscriptions`
--
ALTER TABLE `inscriptions`
  ADD CONSTRAINT `inscriptions_ibfk_1` FOREIGN KEY (`etudiant_id`) REFERENCES `etudiants` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `inscriptions_ibfk_2` FOREIGN KEY (`formation_id`) REFERENCES `formations` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `inscriptions_externes`
--
ALTER TABLE `inscriptions_externes`
  ADD CONSTRAINT `inscriptions_externes_ibfk_1` FOREIGN KEY (`externe_id`) REFERENCES `externes` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `inscriptions_externes_ibfk_2` FOREIGN KEY (`formation_id`) REFERENCES `formations` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `messages`
--
ALTER TABLE `messages`
  ADD CONSTRAINT `messages_ibfk_1` FOREIGN KEY (`expediteur_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `messages_ibfk_2` FOREIGN KEY (`destinataire_id`) REFERENCES `users` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `modules_formation`
--
ALTER TABLE `modules_formation`
  ADD CONSTRAINT `modules_formation_ibfk_1` FOREIGN KEY (`formation_id`) REFERENCES `formations` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `notations`
--
ALTER TABLE `notations`
  ADD CONSTRAINT `notations_ibfk_1` FOREIGN KEY (`etudiant_id`) REFERENCES `etudiants` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `notations_ibfk_2` FOREIGN KEY (`formation_id`) REFERENCES `formations` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `notifications`
--
ALTER TABLE `notifications`
  ADD CONSTRAINT `notifications_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `presences`
--
ALTER TABLE `presences`
  ADD CONSTRAINT `presences_ibfk_1` FOREIGN KEY (`seance_id`) REFERENCES `seances` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `presences_ibfk_2` FOREIGN KEY (`etudiant_id`) REFERENCES `etudiants` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `programme_formations`
--
ALTER TABLE `programme_formations`
  ADD CONSTRAINT `programme_formations_ibfk_1` FOREIGN KEY (`formation_id`) REFERENCES `formations` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `progression_etudiants`
--
ALTER TABLE `progression_etudiants`
  ADD CONSTRAINT `progression_etudiants_ibfk_1` FOREIGN KEY (`etudiant_id`) REFERENCES `etudiants` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `progression_etudiants_ibfk_2` FOREIGN KEY (`formation_id`) REFERENCES `formations` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `progression_etudiants_ibfk_3` FOREIGN KEY (`module_id`) REFERENCES `modules_formation` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `questions`
--
ALTER TABLE `questions`
  ADD CONSTRAINT `questions_ibfk_1` FOREIGN KEY (`formation_id`) REFERENCES `formations` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `questions_ibfk_2` FOREIGN KEY (`etudiant_id`) REFERENCES `users` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `seances`
--
ALTER TABLE `seances`
  ADD CONSTRAINT `seances_ibfk_1` FOREIGN KEY (`formation_id`) REFERENCES `formations` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `supports`
--
ALTER TABLE `supports`
  ADD CONSTRAINT `supports_ibfk_1` FOREIGN KEY (`formation_id`) REFERENCES `formations` (`id`) ON DELETE CASCADE;
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
