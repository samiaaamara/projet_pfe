-- phpMyAdmin SQL Dump
-- version 5.2.1
-- https://www.phpmyadmin.net/
--
-- Host: 127.0.0.1
-- Generation Time: May 20, 2026 at 04:53 PM
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

-- --------------------------------------------------------

--
-- Table structure for table `candidats`
--

CREATE TABLE `candidats` (
  `id` int(11) NOT NULL,
  `user_id` int(11) NOT NULL,
  `progression` int(11) DEFAULT 0,
  `niveau` varchar(50) DEFAULT NULL,
  `specialite` varchar(100) DEFAULT NULL,
  `cin` varchar(20) DEFAULT NULL,
  `telephone` varchar(20) DEFAULT NULL,
  `date_naissance` date DEFAULT NULL,
  `entreprise` varchar(150) DEFAULT NULL,
  `type_candidat` varchar(50) DEFAULT 'etudiant'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `candidats`
--

INSERT INTO `candidats` (`id`, `user_id`, `progression`, `niveau`, `specialite`, `cin`, `telephone`, `date_naissance`, `entreprise`, `type_candidat`) VALUES
(7, 38, 0, 'L3', 'Developement web', '13039306', NULL, NULL, NULL, 'etudiant'),
(8, 43, 0, 'M1', 'Informatique', '13306405', '29800945', '2003-12-31', NULL, 'etudiant'),
(9, 45, 0, 'M1', 'Informatique', '14151217', '96800999', '1997-05-08', NULL, 'etudiant'),
(10, 57, 0, 'L2', 'Réseaux et Télécommunications', '15181923', '26722540', '2004-07-02', 'iset tozeur', 'etudiant'),
(11, 60, 0, 'L3', 'Réseaux et Télécommunications', '14151613', '29800945', '2006-01-01', 'iset tozeur', 'etudiant'),
(12, 66, 0, NULL, NULL, NULL, NULL, NULL, NULL, 'etudiant');

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
(2, 41, '+21629800945', 'iset', 'finance', '1996-01-01'),
(3, 46, '96500656', 'iset kef', 'Informatique', '1980-05-06'),
(4, 56, '92799110', 'iset', 'Informatique', '2002-11-11'),
(5, 58, '92799110', 'ihec', 'Réseaux et Télécommunications', '2003-01-01'),
(6, 61, '92799110', 'ihec', 'Informatique', '2025-03-01');

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
(3, 35, 'Informatique', NULL, NULL),
(5, 44, 'Génie Mécanique', NULL, NULL),
(6, 47, 'Réseaux et Télécommunications', '58316370', '1969-01-21'),
(7, 48, 'Génie Logiciel', '58316870', '1960-05-21'),
(8, 49, 'Intelligence Artificielle', '50655840', '1970-06-25'),
(9, 50, 'Génie Civil', '55471859', '1970-07-17'),
(10, 51, 'Génie Électrique', '50444888', '1970-07-07'),
(11, 52, 'Électronique', '55777888', '1967-10-01'),
(12, 53, 'Finance et Comptabilité', '50250760', '2000-10-01'),
(13, 54, 'Commerce et Marketing', '99560450', '1994-07-25'),
(14, 55, 'Gestion des Entreprises', '29800945', '2004-05-01');

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
  `prix` decimal(10,2) DEFAULT 0.00,
  `photo` varchar(255) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `formations`
--

INSERT INTO `formations` (`id`, `titre`, `description`, `date_debut`, `formateur_id`, `specialite`, `status`, `date_fin`, `duree`, `nb_places`, `prix`, `photo`) VALUES
(28, 'Programmation Python et Développement d’Applications', 'Formation pratique pour apprendre Python, les bases de données et le développement d’applications modernes.', '2026-05-19', 3, 'Informatique', 'published', '2026-05-21', NULL, 4, 99.98, '/uploads/1779110476407-462143.webp'),
(32, ',test', 'tes', '2026-05-20', 2, 'Développement Web', 'published', '2026-05-22', NULL, 3, 100.00, NULL),
(33, 'form', 'form', NULL, 3, 'Informatique', 'accepted', NULL, NULL, NULL, 0.00, NULL);

-- --------------------------------------------------------

--
-- Table structure for table `inscriptions`
--

CREATE TABLE `inscriptions` (
  `id` int(11) NOT NULL,
  `candidat_id` int(11) NOT NULL,
  `formation_id` int(11) NOT NULL,
  `date_inscription` date DEFAULT curdate(),
  `statut` varchar(50) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `inscriptions`
--

INSERT INTO `inscriptions` (`id`, `candidat_id`, `formation_id`, `date_inscription`, `statut`) VALUES
(31, 8, 28, '2026-05-18', 'Inscrit'),
(32, 9, 28, '2026-05-18', 'en_attente'),
(33, 10, 32, '2026-05-18', 'Inscrit'),
(34, 10, 28, '2026-05-18', 'Inscrit'),
(35, 12, 28, '2026-05-19', 'en_attente');

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
  `payment_ref` varchar(100) DEFAULT NULL,
  `statut` varchar(50) DEFAULT 'Inscrit'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `inscriptions_externes`
--

INSERT INTO `inscriptions_externes` (`id`, `externe_id`, `formation_id`, `montant`, `statut_paiement`, `statut_inscription`, `date_inscription`, `date_paiement`, `payment_ref`, `statut`) VALUES
(16, 6, 28, 99.98, 'payé', 'confirmé', '2026-05-18 14:39:34', '2026-05-18 14:39:43', 'cs_test_a1cmkeCqw0HpwBpgfODcnpFjr81c3ZHM4DR0lw2qoBd4aUsceRmz45evv5', 'Inscrit'),
(17, 2, 32, 100.00, 'en_attente', 'confirmé', '2026-05-18 15:37:42', NULL, NULL, 'Inscrit'),
(18, 2, 28, 99.98, 'payé', 'confirmé', '2026-05-18 15:55:22', '2026-05-18 15:57:14', 'cs_test_a1jMv8tBMEPWtrDcI6C5jJ96dKr5GNhpmgrG8M5xyM6uzZv8fsDoYnNJM7', 'Inscrit');

-- --------------------------------------------------------

--
-- Table structure for table `justificatifs`
--

CREATE TABLE `justificatifs` (
  `id` int(11) NOT NULL,
  `candidat_id` int(11) NOT NULL,
  `externe_id` int(11) DEFAULT NULL,
  `seance_id` int(11) NOT NULL,
  `motif` text NOT NULL,
  `statut` enum('en_attente','accepté','refusé') DEFAULT 'en_attente',
  `date_soumission` datetime DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `liste_attente`
--

CREATE TABLE `liste_attente` (
  `id` int(11) NOT NULL,
  `candidat_id` int(11) DEFAULT NULL,
  `externe_id` int(11) DEFAULT NULL,
  `formation_id` int(11) NOT NULL,
  `date_ajout` datetime DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `liste_attente`
--

INSERT INTO `liste_attente` (`id`, `candidat_id`, `externe_id`, `formation_id`, `date_ajout`) VALUES
(3, NULL, 3, 28, '2026-05-18 15:03:24'),
(4, 11, NULL, 28, '2026-05-18 15:03:40');

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
(5, 43, 35, 'bonjour', 1, '2026-05-03 15:52:28'),
(6, 41, 35, 'salut', 1, '2026-05-03 16:08:07'),
(7, 36, 35, 'salut', 1, '2026-05-04 12:22:47'),
(8, 45, 35, 'salut madame', 1, '2026-05-08 00:37:14');

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
(18, 28, 'Introduction à Python et Installation des Outils', 'Découverte du langage Python, installation de Python, VS Code et premiers programmes.', NULL, 1),
(19, 28, 'Titre du module', 'Variables, types de données, conditions, boucles, fonctions et manipulation des chaînes.', NULL, 2),
(20, 28, 'Programmation Orientée Objet avec Python', 'Classes, objets, héritage, encapsulation et création d’applications orientées objet.', NULL, 3),
(21, 33, 'form', 'form', NULL, 0);

-- --------------------------------------------------------

--
-- Table structure for table `notations`
--

CREATE TABLE `notations` (
  `id` int(11) NOT NULL,
  `candidat_id` int(11) NOT NULL,
  `formation_id` int(11) NOT NULL,
  `note` tinyint(4) NOT NULL,
  `commentaire` text DEFAULT NULL,
  `date_notation` datetime DEFAULT current_timestamp(),
  `externe_id` int(11) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

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
(3, 35, '📚 samiaa amara s\'est inscrit à votre formation « angular »', 'inscription', 1, '2026-04-29 11:10:18'),
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
(19, 35, '📚 firas amara s\'est inscrit à votre formation « fcggvb »', 'inscription', 1, '2026-05-03 15:36:57'),
(20, 35, '🚀 Votre formation « fvdcc » est maintenant publiée dans le catalogue !', 'publication', 1, '2026-05-04 12:22:11'),
(24, 43, '🏆 Votre présence à la formation « Développement Web Full Stack » a été validée !', 'presence', 1, '2026-05-05 18:53:25'),
(25, 36, '🔔 Nouvelle formation en attente d\'approbation : « Introduction au Génie Mécanique Industriel »', 'approbation', 0, '2026-05-05 19:19:39'),
(26, 44, '✅ Votre formation « Introduction au Génie Mécanique Industriel » a été acceptée par l\'administrateur. Elle sera publiée prochainement.', 'approbation', 0, '2026-05-05 19:21:50'),
(27, 44, '🚀 Votre formation « Introduction au Génie Mécanique Industriel » est maintenant publiée dans le catalogue !', 'publication', 0, '2026-05-05 19:47:23'),
(28, 43, '🎓 Félicitations ! Vous avez complété 100% de la formation \"Créer des API avec FastAPI\" !', 'approbation', 1, '2026-05-06 17:50:20'),
(29, 43, '🎓 Félicitations ! Vous avez complété 100% de la formation \"Créer des API avec FastAPI\" !', 'approbation', 1, '2026-05-06 17:50:36'),
(31, 43, '📋 Votre absence à la formation « Développement Web Full Stack » a été enregistrée.', 'presence', 1, '2026-05-06 17:51:06'),
(32, 43, '⚠️ Votre taux de présence pour « Développement Web Full Stack » est de 0%. Un taux minimum de 75% est requis.', 'presence', 1, '2026-05-06 17:51:32'),
(33, 43, '⚠️ Votre taux de présence pour « Développement Web Full Stack » est de 0%. Un taux minimum de 75% est requis.', 'presence', 1, '2026-05-06 17:51:33'),
(39, 36, '🔔 Nouvelle formation en attente d\'approbation : « Introduction à l’Intelligence Artificielle et au Machine Learning »', 'approbation', 0, '2026-05-07 23:00:57'),
(40, 35, '✅ Votre formation « Introduction à l’Intelligence Artificielle et au Machine Learning » a été acceptée par l\'administrateur. Elle sera publiée prochainement.', 'approbation', 1, '2026-05-07 23:01:20'),
(41, 35, '🚀 Votre formation « Introduction à l’Intelligence Artificielle et au Machine Learning » est maintenant publiée dans le catalogue !', 'publication', 1, '2026-05-07 23:14:58'),
(43, 43, '⚠️ Votre taux de présence pour « Développement Web Full Stack » est de 50%. Un taux minimum de 75% est requis.', 'presence', 1, '2026-05-07 23:26:46'),
(44, 43, '⚠️ Votre taux de présence pour « Développement Web Full Stack » est de 50%. Un taux minimum de 75% est requis.', 'presence', 1, '2026-05-07 23:26:57'),
(45, 43, '⚠️ Votre taux de présence pour « Développement Web Full Stack » est de 50%. Un taux minimum de 75% est requis.', 'presence', 1, '2026-05-07 23:26:59'),
(46, 43, '⚠️ Votre taux de présence pour « Développement Web Full Stack » est de 50%. Un taux minimum de 75% est requis.', 'presence', 1, '2026-05-07 23:27:00'),
(47, 35, '📚 firas amara s\'est inscrit à votre formation « Introduction à Django »', 'inscription', 1, '2026-05-08 00:04:12'),
(48, 35, '📚 ahmed zoggari s\'est inscrit à votre formation « Développement Web Full Stack »', 'inscription', 1, '2026-05-08 00:36:49'),
(49, 35, '📚 ahmed zoggari s\'est inscrit à votre formation « Introduction à l’Intelligence Artificielle et au Machine Learning »', 'inscription', 1, '2026-05-08 00:36:53'),
(50, 43, '🏆 Votre présence à la formation « Introduction à Django » a été validée !', 'presence', 1, '2026-05-08 23:07:49'),
(51, 43, '🎓 Félicitations ! Vous avez complété 100% de la formation \"Développement Web Full Stack\" !', 'approbation', 1, '2026-05-08 23:09:36'),
(52, 43, '📋 Votre absence à la formation « Introduction à Django » a été enregistrée.', 'presence', 1, '2026-05-08 23:09:53'),
(53, 43, '🏆 Votre présence à la formation « Introduction à Django » a été validée !', 'presence', 1, '2026-05-08 23:09:55'),
(54, 43, '📋 Votre absence à la formation « Introduction à Django » a été enregistrée.', 'presence', 1, '2026-05-08 23:09:56'),
(55, 43, '🏆 Votre présence à la formation « Introduction à Django » a été validée !', 'presence', 1, '2026-05-08 23:09:58'),
(56, 43, '🏆 Votre présence à la formation « Développement Web Full Stack » a été validée !', 'presence', 1, '2026-05-08 23:10:13'),
(60, 43, '📋 Votre absence à la formation « Développement Web Full Stack » a été enregistrée.', 'presence', 1, '2026-05-08 23:31:51'),
(62, 43, '🏆 Votre présence à la formation « Développement Web Full Stack » a été validée !', 'presence', 1, '2026-05-08 23:32:56'),
(64, 43, '📋 Votre absence à la formation « Développement Web Full Stack » a été enregistrée.', 'presence', 1, '2026-05-08 23:33:13'),
(65, 43, '🏆 Votre présence à la formation « Développement Web Full Stack » a été validée !', 'presence', 1, '2026-05-09 00:11:15'),
(66, 36, '🔔 Nouvelle formation en attente d\'approbation : « Formation en Commerce et Marketing Digital »', 'approbation', 0, '2026-05-11 13:02:36'),
(67, 54, '✅ Votre formation « Formation en Commerce et Marketing Digital » a été acceptée par l\'administrateur. Elle sera publiée prochainement.', 'approbation', 1, '2026-05-11 13:31:43'),
(68, 56, 'Paiement de 129.97 EUR confirmé pour \"Créer des API avec FastAPI\" ✅', 'approbation', 0, '2026-05-11 13:42:51'),
(69, 56, 'Inscription confirmée pour la formation \"Introduction à Django\" ✅', 'approbation', 0, '2026-05-11 14:18:01'),
(70, 56, 'Paiement de 150.00 EUR confirmé pour \"Introduction à l’Intelligence Artificielle et au Machine Learning\" ✅', 'approbation', 0, '2026-05-11 14:18:30'),
(71, 56, 'Paiement de 150.00 EUR confirmé pour \"Introduction à l’Intelligence Artificielle et au Machine Learning\" ✅', 'approbation', 0, '2026-05-11 14:25:34'),
(72, 43, '🏆 Votre présence à la formation « Créer des API avec FastAPI » a été validée !', 'presence', 1, '2026-05-11 15:10:00'),
(75, 56, '🏆 Votre présence à la formation « Introduction à Django » a été validée !', 'presence', 0, '2026-05-11 15:46:20'),
(78, 56, '🏆 Votre présence à la formation « Introduction à Django » a été validée !', 'presence', 0, '2026-05-11 15:47:10'),
(83, 56, '🏆 Votre présence à la formation « Introduction à Django » a été validée !', 'presence', 0, '2026-05-11 16:49:37'),
(85, 43, '🎓 Félicitations ! Vous avez complété 100% de la formation \"Développement Web Full Stack\" !', 'approbation', 1, '2026-05-11 16:57:21'),
(88, 54, '🚀 Votre formation « Formation en Commerce et Marketing Digital » est maintenant publiée dans le catalogue !', 'publication', 0, '2026-05-14 13:49:29'),
(89, 35, '📚 firas amara s\'est inscrit à votre formation « Introduction à l’Intelligence Artificielle et au Machine Learning »', 'inscription', 1, '2026-05-14 13:54:41'),
(90, 36, '🔔 Nouvelle formation en attente d\'approbation : « Administration et Configuration des Réseaux Informatiques »', 'approbation', 0, '2026-05-16 14:27:47'),
(91, 47, '✅ Votre formation « Administration et Configuration des Réseaux Informatiques » a été acceptée par l\'administrateur. Elle sera publiée prochainement.', 'approbation', 1, '2026-05-16 14:35:43'),
(92, 47, '🚀 Votre formation « Administration et Configuration des Réseaux Informatiques » est maintenant publiée dans le catalogue !', 'publication', 1, '2026-05-16 20:52:55'),
(93, 47, '📚 safe amara s\'est inscrit à votre formation « Administration et Configuration des Réseaux Informatiques »', 'inscription', 1, '2026-05-16 20:53:20'),
(94, 47, '📋 Une nouvelle formation vous a été assignée : « Sécurité des Réseaux et Cybersécurité » — Spécialité : Réseaux et Télécommunications — Début : 19/05/2026', 'assignation', 1, '2026-05-16 21:02:08'),
(95, 57, '⚠️ Votre taux de présence pour « Administration et Configuration des Réseaux Informatiques » est de 25%. Un taux minimum de 75% est requis.', 'presence', 1, '2026-05-16 21:15:16'),
(96, 57, '⚠️ Votre taux de présence pour « Administration et Configuration des Réseaux Informatiques » est de 0%. Un taux minimum de 75% est requis.', 'presence', 1, '2026-05-16 21:15:18'),
(97, 57, '⚠️ Votre taux de présence pour « Administration et Configuration des Réseaux Informatiques » est de 25%. Un taux minimum de 75% est requis.', 'presence', 1, '2026-05-16 21:15:23'),
(98, 57, '⚠️ Votre taux de présence pour « Administration et Configuration des Réseaux Informatiques » est de 0%. Un taux minimum de 75% est requis.', 'presence', 1, '2026-05-16 21:16:08'),
(99, 57, '🏆 Votre présence à la formation « Administration et Configuration des Réseaux Informatiques » a été validée !', 'presence', 1, '2026-05-17 02:11:10'),
(100, 57, '⚠️ Votre taux de présence pour « Administration et Configuration des Réseaux Informatiques » est de 25%. Un taux minimum de 75% est requis.', 'presence', 1, '2026-05-17 02:11:19'),
(101, 57, '⚠️ Votre taux de présence pour « Administration et Configuration des Réseaux Informatiques » est de 25%. Un taux minimum de 75% est requis.', 'presence', 1, '2026-05-17 02:11:19'),
(102, 57, '⚠️ Votre taux de présence pour « Administration et Configuration des Réseaux Informatiques » est de 50%. Un taux minimum de 75% est requis.', 'presence', 1, '2026-05-17 02:11:23'),
(103, 57, '🎓 Félicitations ! Vous avez complété 100% de la formation \"Administration et Configuration des Réseaux Informatiques\" !', 'approbation', 1, '2026-05-17 02:11:48'),
(104, 57, '📋 Votre absence à la formation « Administration et Configuration des Réseaux Informatiques » a été enregistrée.', 'presence', 1, '2026-05-17 02:12:52'),
(105, 57, '🏆 Votre présence à la formation « Administration et Configuration des Réseaux Informatiques » a été validée !', 'presence', 1, '2026-05-17 02:12:53'),
(106, 57, '🎓 Félicitations ! Vous avez complété 100% de la formation « Administration et Configuration des Réseaux Informatiques ». Votre attestation est disponible !', 'progression', 1, '2026-05-17 02:14:36'),
(107, 36, '🔔 Nouvelle formation en attente d\'approbation : « Sécurité des Réseaux et Cybersécurité »', 'approbation', 0, '2026-05-18 12:12:17'),
(108, 47, '✅ Votre formation « Sécurité des Réseaux et Cybersécurité » a été acceptée par l\'administrateur. Elle sera publiée prochainement.', 'approbation', 1, '2026-05-18 12:12:53'),
(109, 36, '🔔 Nouvelle formation en attente d\'approbation : « Technologies de Télécommunication et Réseaux Sans Fil »', 'approbation', 0, '2026-05-18 12:46:06'),
(110, 47, '🚀 Votre formation « Sécurité des Réseaux et Cybersécurité » est maintenant publiée dans le catalogue !', 'publication', 1, '2026-05-18 12:48:22'),
(111, 47, '✅ Votre formation « Technologies de Télécommunication et Réseaux Sans Fil » a été acceptée par l\'administrateur. Elle sera publiée prochainement.', 'approbation', 1, '2026-05-18 12:51:56'),
(112, 47, '🚀 Votre formation « Technologies de Télécommunication et Réseaux Sans Fil » est maintenant publiée dans le catalogue !', 'publication', 1, '2026-05-18 12:55:09'),
(115, 35, '📋 Une nouvelle formation vous a été assignée : « Programmation Python et Développement d’Applications » — Spécialité : Informatique — Début : 20/05/2026', 'assignation', 1, '2026-05-18 14:21:16'),
(116, 35, '📋 Une nouvelle formation vous a été assignée : « dcdvdv » — Spécialité : Informatique — Début : 20/05/2026', 'assignation', 1, '2026-05-18 14:27:43'),
(117, 35, '📋 Une nouvelle formation vous a été assignée : « Programmation Python et Développement d’Applications » — Spécialité : Informatique — Début : 20/05/2026', 'assignation', 1, '2026-05-18 14:29:13'),
(118, 35, '📋 Une nouvelle formation vous a été assignée : « dcssc » — Spécialité : Informatique — Début : 22/05/2026', 'assignation', 1, '2026-05-18 14:33:55'),
(119, 61, 'Paiement de 99.98 EUR confirmé pour \"Programmation Python et Développement d’Applications\" ✅', 'approbation', 0, '2026-05-18 14:39:43'),
(120, 3, '📋 Une nouvelle formation vous a été assignée : « ,test » — Spécialité : Développement Web — Début : 20/05/2026', 'assignation', 0, '2026-05-18 15:34:18'),
(121, 43, '✅ Votre demande d\'inscription à la formation « Programmation Python et Développement d’Applications » a été approuvée !', 'inscription', 1, '2026-05-18 15:39:57'),
(122, 35, '📚 firas amara a été inscrit à votre formation « Programmation Python et Développement d’Applications »', 'inscription', 0, '2026-05-18 15:39:57'),
(123, 41, '✅ Votre demande pour « Programmation Python et Développement d’Applications » est approuvée. Vous pouvez maintenant procéder au paiement.', 'inscription', 0, '2026-05-18 15:56:38'),
(124, 41, 'Paiement de 99.98 EUR confirmé pour \"Programmation Python et Développement d’Applications\" ✅', 'approbation', 0, '2026-05-18 15:57:14'),
(125, 57, '✅ Votre demande d\'inscription à la formation « ,test » a été approuvée !', 'inscription', 0, '2026-05-18 16:02:49'),
(126, 3, '📚 safe amara a été inscrit à votre formation « ,test »', 'inscription', 0, '2026-05-18 16:02:49'),
(127, 57, '✅ L\'administrateur vous a inscrit(e) dans la formation « Programmation Python et Développement d’Applications ».', 'inscription', 0, '2026-05-18 18:19:06'),
(128, 36, '🔔 Nouvelle formation en attente d\'approbation : « form »', 'approbation', 0, '2026-05-18 20:05:57'),
(129, 35, '✅ Votre formation « form » a été acceptée par l\'administrateur. Elle sera publiée prochainement.', 'approbation', 0, '2026-05-18 20:09:48'),
(130, 41, '✅ Votre demande pour « ,test » est approuvée. Vous pouvez maintenant procéder au paiement.', 'inscription', 0, '2026-05-18 20:21:36');

-- --------------------------------------------------------

--
-- Table structure for table `password_resets`
--

CREATE TABLE `password_resets` (
  `id` int(11) NOT NULL,
  `email` varchar(255) NOT NULL,
  `token` varchar(255) NOT NULL,
  `expires_at` datetime NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `presences`
--

CREATE TABLE `presences` (
  `id` int(11) NOT NULL,
  `seance_id` int(11) NOT NULL,
  `candidat_id` int(11) NOT NULL,
  `statut` enum('présent','absent','retard','excusé') NOT NULL DEFAULT 'absent',
  `externe_id` int(11) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

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
(13, 28, 'Cette formation en informatique permet aux participants d’apprendre la programmation avec Python ainsi que le développement d’applications modernes. Elle couvre les bases du langage Python, la programmation orientée objet, la manipulation des bases de données et la création d’applications web et desktop.\n\nLes apprenants réaliseront plusieurs exercices pratiques et mini-projets afin de développer des compétences solides en développement logiciel et en résolution de problèmes informatiques.', 'À la fin de cette formation, les apprenants seront capables de :\n\nComprendre les bases de la programmation avec Python\nÉcrire des programmes structurés et optimisés\nUtiliser les concepts de programmation orientée objet\nManipuler des fichiers et bases de données\nDévelopper des applications simples avec Python\nCréer des API et applications web de base\nCorriger et tester un programme informatique\nUtiliser des bibliothèques Python populaires', 'Connaissances de base en informatique\nSavoir utiliser un ordinateur\nAucune expérience avancée en programmation n’est requise\nMotivation pour apprendre le développement logiciel'),
(15, 32, 'test', 'test', 'test'),
(16, 33, 'form', 'form', 'form');

-- --------------------------------------------------------

--
-- Table structure for table `progression_candidats`
--

CREATE TABLE `progression_candidats` (
  `id` int(11) NOT NULL,
  `candidat_id` int(11) NOT NULL,
  `formation_id` int(11) NOT NULL,
  `module_id` int(11) NOT NULL,
  `statut` enum('non_commence','en_cours','termine') NOT NULL DEFAULT 'non_commence',
  `date_maj` datetime DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `externe_id` int(11) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

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
-- Table structure for table `questions_quiz`
--

CREATE TABLE `questions_quiz` (
  `id` int(11) NOT NULL,
  `quiz_id` int(11) NOT NULL,
  `question` text NOT NULL,
  `ordre` int(11) DEFAULT 0
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `questions_quiz`
--

INSERT INTO `questions_quiz` (`id`, `quiz_id`, `question`, `ordre`) VALUES
(21, 4, ' n, ', 0),
(22, 5, 'form', 0);

-- --------------------------------------------------------

--
-- Table structure for table `quiz`
--

CREATE TABLE `quiz` (
  `id` int(11) NOT NULL,
  `formation_id` int(11) NOT NULL,
  `titre` varchar(200) NOT NULL DEFAULT 'Quiz de validation',
  `seuil_reussite` int(11) NOT NULL DEFAULT 70,
  `nb_tentatives` int(11) NOT NULL DEFAULT 3
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `quiz`
--

INSERT INTO `quiz` (`id`, `formation_id`, `titre`, `seuil_reussite`, `nb_tentatives`) VALUES
(4, 32, 'Quiz de validation', 70, 3),
(5, 33, 'Quiz de validation', 70, 3);

-- --------------------------------------------------------

--
-- Table structure for table `reponses_quiz`
--

CREATE TABLE `reponses_quiz` (
  `id` int(11) NOT NULL,
  `question_id` int(11) NOT NULL,
  `reponse` text NOT NULL,
  `est_correcte` tinyint(1) NOT NULL DEFAULT 0
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `reponses_quiz`
--

INSERT INTO `reponses_quiz` (`id`, `question_id`, `reponse`, `est_correcte`) VALUES
(73, 21, ', , , ', 1),
(74, 21, ' ,kk', 0),
(75, 21, 'kkk', 0),
(76, 22, 'form', 1),
(77, 22, 'form', 0),
(78, 22, 'form', 0);

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
  `statut` enum('planifiée','en_cours','terminée') NOT NULL DEFAULT 'planifiée',
  `module_id` int(11) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `seances`
--

INSERT INTO `seances` (`id`, `formation_id`, `date_seance`, `heure_debut`, `heure_fin`, `salle`, `statut`, `module_id`) VALUES
(21, 28, '2026-05-20', '10:00:00', '13:00:00', 'li12', 'planifiée', 18),
(22, 28, '2026-05-21', '10:00:00', '13:00:00', 'li13', 'planifiée', 19),
(23, 28, '2026-05-22', '10:00:00', '13:00:00', 'li11', 'planifiée', 20);

-- --------------------------------------------------------

--
-- Table structure for table `specialites`
--

CREATE TABLE `specialites` (
  `id` int(11) NOT NULL,
  `nom` varchar(100) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `specialites`
--

INSERT INTO `specialites` (`id`, `nom`) VALUES
(5, 'Cybersécurité'),
(7, 'Finance'),
(9, 'Génie civil'),
(10, 'Génie électrique'),
(3, 'Génie logiciel'),
(1, 'Informatique'),
(4, 'Intelligence artificielle'),
(6, 'Marketing'),
(8, 'Mécanique'),
(2, 'Réseaux');

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

--
-- Dumping data for table `supports`
--

INSERT INTO `supports` (`id`, `type`, `fichier`, `formation_id`) VALUES
(14, 'image', '/uploads/1779110653900-989655.webp', 28),
(15, 'pdf', '/uploads/1779110674106-235685.pdf', 28),
(16, 'Autre', '/uploads/1779130990130-771744.jpg', 33);

-- --------------------------------------------------------

--
-- Table structure for table `tentatives_quiz`
--

CREATE TABLE `tentatives_quiz` (
  `id` int(11) NOT NULL,
  `candidat_id` int(11) DEFAULT NULL,
  `externe_id` int(11) DEFAULT NULL,
  `quiz_id` int(11) NOT NULL,
  `score` int(11) NOT NULL,
  `reussi` tinyint(1) NOT NULL DEFAULT 0,
  `date_tentative` datetime NOT NULL DEFAULT current_timestamp()
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
  `role` enum('candidat','formateur','admin','externe') NOT NULL,
  `photo_profil` varchar(255) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `users`
--

INSERT INTO `users` (`id`, `nom`, `email`, `mot_de_passe`, `role`, `photo_profil`) VALUES
(3, 'ranim jemai', 'ranimjemai@gmail.com', 'ranim321', 'formateur', NULL),
(35, 'sabeh jari', 'sabehjari44@gmail.com', '$2b$10$K6dKPRh7DUePf41eETSsV.hcX75AtU6PuNfdCCHuNb7W6nW3N/a42', 'formateur', '/uploads/profil-1778705395504-970828.jpg'),
(36, 'Admin', 'admin@gmail.com', '$2b$10$MNETw.gLMhww7556DEt6t.jHivP97u59eYc12z7VVdxk6nzdM9HTu', 'admin', NULL),
(38, 'samiaa amara', 'samiaa.amara44', '$2b$10$6Vl4SQ4QUsrLfSpAvYmIdua7VsQpPSAuRpt/qW0nev1IsYEcVuKEy', 'candidat', NULL),
(41, 'amel derouich ', 'amel12@gmail.com', '$2b$10$gVJKdObQAKABzJpXGjUzBO2WdSfD0IQ5NO0mW96sELRPrff85Yo0G', 'externe', NULL),
(43, 'firas amara', 'firasamara11@gmail.com', '$2b$10$uneDV1go3wKYMJOGnYOfUu2KfADLrzlET/dGLeDSOyEnREwFNuCfO', 'candidat', '/uploads/profil-1778705801014-895536.jpg'),
(44, 'med amara', 'medamara11@gmail.com', '$2b$10$eJOtaOIMVqEFbGi7CHlryOemtuSebMdt8wu6MFVkcYrVY9/8lIS9.', 'formateur', NULL),
(45, 'ahmed zoggari', 'ahmed12@gmail.com', '$2b$10$6r9iFZZWD8/JkcEXExFu..efj2yiuNPHsqQ2xoT7PEiSoNFTuzE2C', 'candidat', NULL),
(46, 'jamila  jari', 'jamila12@gmail.com', '$2b$10$QzNHGVOAOnIhs8J2MbD/9OYl.dCEOPJwyOIs7u6owwhrc1ad0Ppe6', 'externe', NULL),
(47, 'abdo amara', 'abdoamara@gmail.com', '$2b$10$bP2jLtOIYoObH4FKNpgcSeifAUCgpxF45TPOeafc6Q4kwRoEb2gxm', 'formateur', '/uploads/profil-1778939799244-599678.jpg'),
(48, 'nitham amara', 'nithamamara@gmail.com', '$2b$10$d0V8ENI46zUkMuPcO9DrheD6QKCB5xWzwzOSnWZQQ25GaiBVLA/JW', 'formateur', NULL),
(49, 'med jari', 'medjari@gmail.com', '$2b$10$aZLIKwZsHUezcvQbxTHhOuX74BUNXO/nmOR0gYWN3GAF8k3sjaVMa', 'formateur', NULL),
(50, 'amara amara', 'amaraamara@gmail.com', '$2b$10$sFAARy3nXfLUWlRyteaYfu0o8IKTsNqihpYdaCnnr7nmJETwwpIge', 'formateur', NULL),
(51, 'hala ayari', 'halaayari@gmail.com', '$2b$10$lqF1/K.YwdaKhcnn6COe9OOdk9sZDPF9j9favLz/ynLUO/9Zzsdxy', 'formateur', NULL),
(52, 'sameh jari', 'samehjari@gmail.com', '$2b$10$ejfk.WiyN5487.iBIfB.k.l.sTVqdfetj3wpyyIFfWRHhYMQDIeLi', 'formateur', NULL),
(53, 'karim jari', 'karimjari@gmail.com', '$2b$10$zbWt9W9r4qVSJ3xIiE3lVOexIShVTCfWuFWNK2iAZWqzV1.wdzNQy', 'formateur', NULL),
(54, 'amine derouich', 'aminederouich@gmail.com', '$2b$10$6gjk9kMU4Ht0RsavHSwMKuUCcbVdYFyIQBijzUco2LVQUa49j1KYS', 'formateur', NULL),
(55, 'dali amara', 'daliamara@gmail.com', '$2b$10$SKLsYNrTGpvtesSPOgtRn.koC2Wa.kb/Q8JeNNiLQztvQM7SNuIZm', 'formateur', NULL),
(56, 'samiaa amara', 'amara14@gmail.com', '$2b$10$oVX.LhA31Jl0rN/FXFhqD.RmjkQrlBv/.TGja2vOQfI798zqTcsoa', 'externe', NULL),
(57, 'safe amara', 'safe14@gmail.com', '$2b$10$AC7/WeA6jPqZxzubMjd4WOwwl7YOSR8OBuPDt3h//AfRMp6RI42m2', 'candidat', '/uploads/profil-1778933426047-186297.jpg'),
(58, 'externe', 'externe14@gmail.com', '$2b$10$P9jaudlfkJatcxQbotCTpetkrDPxv4uR4dbAwDhf0VEDEfibrD6X6', 'externe', NULL),
(59, 'sam amara', 'sam14@gmail.com', '$2b$10$wz/Q36X/L2Oca0iLZyDle.ru5Kdy05uoKvlvcyNK5k9pOV8TyA8/O', 'candidat', NULL),
(60, 'sam amara', 'samara@gmail.com', '$2b$10$7B0rNKdo6yweBtGUAUz3L.cjOw9DJ0mzOAVTYEwfaFdQ0xISoZJri', 'candidat', NULL),
(61, 'externe', 'amara@gmail.com', '$2b$10$vumk5uhjNQFHdOj/nfO4c.UJYYkcv8aJ.8t794EibUMq2ERplNSt.', 'externe', NULL),
(62, 'candidat', 'candidat@gmail.com', '$2b$10$RjJ8ahUN54Ok3Q4mEtkPT.ocLiWn0d0NXT4PuRS.T.QbAwEGOdA6C', 'candidat', NULL),
(63, 'candidat', 'candidat1@gmail.com', '$2b$10$sapgWwSOf.1QdrqvAf.bke4lfwuCBrsuMj3/KuXq.4GIwLFjP5d0e', 'candidat', NULL),
(64, 'candidat', 'candidat10@gmail.com', '$2b$10$T8miAPGq39vlsFjh7Nlzw.1BuxmWeJm7adxOffmP2kbVAFt10tsc2', 'candidat', NULL),
(65, 'enseignant', 'enseignant@gmail.com', '$2b$10$RmYbtgTjxrvw9xZ8dtxecuG4l1lom.vSApDGXHwqwAvG2vRdFWPu6', 'candidat', NULL),
(66, 'samsam', 'samiaa.amara50@gmail.com', '$2b$10$twf1M.kp.P.Gi3t0.doDWudwXR46FYjVZjOzFlo/dfKZrl7rabP.W', 'candidat', NULL),
(67, 'samsam', 'samiaamaara@gmail.com', '$2b$10$ecClsbnvwRq9ic74QQ5viO77ODL6.6q30prXIQaBDayQ.JOqMqouK', 'candidat', NULL),
(68, 'samsam', 'samiaasamiaa50@gmail.com', '$2b$10$dxy/A7HIMgMxdaO7keHZHOYVC727bvkY55bVHxN81noW/Xf6fdQXK', 'candidat', NULL);

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
-- Indexes for table `candidats`
--
ALTER TABLE `candidats`
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
  ADD UNIQUE KEY `etudiant_id` (`candidat_id`,`formation_id`),
  ADD KEY `formation_id` (`formation_id`);

--
-- Indexes for table `inscriptions_externes`
--
ALTER TABLE `inscriptions_externes`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `unique_externe_formation` (`externe_id`,`formation_id`),
  ADD KEY `formation_id` (`formation_id`);

--
-- Indexes for table `justificatifs`
--
ALTER TABLE `justificatifs`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `uniq_etudiant_seance` (`candidat_id`,`seance_id`),
  ADD UNIQUE KEY `uniq_externe_seance` (`externe_id`,`seance_id`);

--
-- Indexes for table `liste_attente`
--
ALTER TABLE `liste_attente`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `uniq_etudiant_formation` (`candidat_id`,`formation_id`),
  ADD UNIQUE KEY `uniq_externe_formation` (`externe_id`,`formation_id`);

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
  ADD UNIQUE KEY `unique_notation` (`candidat_id`,`formation_id`),
  ADD KEY `formation_id` (`formation_id`);

--
-- Indexes for table `notifications`
--
ALTER TABLE `notifications`
  ADD PRIMARY KEY (`id`),
  ADD KEY `user_id` (`user_id`);

--
-- Indexes for table `password_resets`
--
ALTER TABLE `password_resets`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `token` (`token`),
  ADD KEY `idx_token` (`token`),
  ADD KEY `idx_email` (`email`);

--
-- Indexes for table `presences`
--
ALTER TABLE `presences`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `uq_presence` (`seance_id`,`candidat_id`),
  ADD KEY `etudiant_id` (`candidat_id`);

--
-- Indexes for table `programme_formations`
--
ALTER TABLE `programme_formations`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `uq_prog_formation` (`formation_id`);

--
-- Indexes for table `progression_candidats`
--
ALTER TABLE `progression_candidats`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `uq_prog` (`candidat_id`,`formation_id`,`module_id`),
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
-- Indexes for table `questions_quiz`
--
ALTER TABLE `questions_quiz`
  ADD PRIMARY KEY (`id`),
  ADD KEY `quiz_id` (`quiz_id`);

--
-- Indexes for table `quiz`
--
ALTER TABLE `quiz`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `formation_id` (`formation_id`);

--
-- Indexes for table `reponses_quiz`
--
ALTER TABLE `reponses_quiz`
  ADD PRIMARY KEY (`id`),
  ADD KEY `question_id` (`question_id`);

--
-- Indexes for table `seances`
--
ALTER TABLE `seances`
  ADD PRIMARY KEY (`id`),
  ADD KEY `formation_id` (`formation_id`),
  ADD KEY `fk_seance_module` (`module_id`);

--
-- Indexes for table `specialites`
--
ALTER TABLE `specialites`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `nom` (`nom`);

--
-- Indexes for table `supports`
--
ALTER TABLE `supports`
  ADD PRIMARY KEY (`id`),
  ADD KEY `formation_id` (`formation_id`);

--
-- Indexes for table `tentatives_quiz`
--
ALTER TABLE `tentatives_quiz`
  ADD PRIMARY KEY (`id`),
  ADD KEY `quiz_id` (`quiz_id`);

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
-- AUTO_INCREMENT for table `candidats`
--
ALTER TABLE `candidats`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=13;

--
-- AUTO_INCREMENT for table `externes`
--
ALTER TABLE `externes`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=7;

--
-- AUTO_INCREMENT for table `formateurs`
--
ALTER TABLE `formateurs`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=15;

--
-- AUTO_INCREMENT for table `formations`
--
ALTER TABLE `formations`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=34;

--
-- AUTO_INCREMENT for table `inscriptions`
--
ALTER TABLE `inscriptions`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=36;

--
-- AUTO_INCREMENT for table `inscriptions_externes`
--
ALTER TABLE `inscriptions_externes`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=19;

--
-- AUTO_INCREMENT for table `justificatifs`
--
ALTER TABLE `justificatifs`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `liste_attente`
--
ALTER TABLE `liste_attente`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=14;

--
-- AUTO_INCREMENT for table `messages`
--
ALTER TABLE `messages`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=9;

--
-- AUTO_INCREMENT for table `modules_formation`
--
ALTER TABLE `modules_formation`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=22;

--
-- AUTO_INCREMENT for table `notations`
--
ALTER TABLE `notations`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=6;

--
-- AUTO_INCREMENT for table `notifications`
--
ALTER TABLE `notifications`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=131;

--
-- AUTO_INCREMENT for table `password_resets`
--
ALTER TABLE `password_resets`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=6;

--
-- AUTO_INCREMENT for table `presences`
--
ALTER TABLE `presences`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=25;

--
-- AUTO_INCREMENT for table `programme_formations`
--
ALTER TABLE `programme_formations`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=17;

--
-- AUTO_INCREMENT for table `progression_candidats`
--
ALTER TABLE `progression_candidats`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=54;

--
-- AUTO_INCREMENT for table `questions`
--
ALTER TABLE `questions`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `questions_quiz`
--
ALTER TABLE `questions_quiz`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=23;

--
-- AUTO_INCREMENT for table `quiz`
--
ALTER TABLE `quiz`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=6;

--
-- AUTO_INCREMENT for table `reponses_quiz`
--
ALTER TABLE `reponses_quiz`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=79;

--
-- AUTO_INCREMENT for table `seances`
--
ALTER TABLE `seances`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=24;

--
-- AUTO_INCREMENT for table `specialites`
--
ALTER TABLE `specialites`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=11;

--
-- AUTO_INCREMENT for table `supports`
--
ALTER TABLE `supports`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=17;

--
-- AUTO_INCREMENT for table `tentatives_quiz`
--
ALTER TABLE `tentatives_quiz`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=3;

--
-- AUTO_INCREMENT for table `users`
--
ALTER TABLE `users`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=69;

--
-- Constraints for dumped tables
--

--
-- Constraints for table `admins`
--
ALTER TABLE `admins`
  ADD CONSTRAINT `admins_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `candidats`
--
ALTER TABLE `candidats`
  ADD CONSTRAINT `candidats_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE;

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
  ADD CONSTRAINT `inscriptions_ibfk_1` FOREIGN KEY (`candidat_id`) REFERENCES `candidats` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `inscriptions_ibfk_2` FOREIGN KEY (`formation_id`) REFERENCES `formations` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `inscriptions_externes`
--
ALTER TABLE `inscriptions_externes`
  ADD CONSTRAINT `inscriptions_externes_ibfk_1` FOREIGN KEY (`externe_id`) REFERENCES `externes` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `inscriptions_externes_ibfk_2` FOREIGN KEY (`formation_id`) REFERENCES `formations` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `liste_attente`
--
ALTER TABLE `liste_attente`
  ADD CONSTRAINT `fk_la_candidat` FOREIGN KEY (`candidat_id`) REFERENCES `candidats` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `fk_la_externe` FOREIGN KEY (`externe_id`) REFERENCES `externes` (`id`) ON DELETE CASCADE;

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
  ADD CONSTRAINT `notations_ibfk_1` FOREIGN KEY (`candidat_id`) REFERENCES `candidats` (`id`) ON DELETE CASCADE,
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
  ADD CONSTRAINT `presences_ibfk_2` FOREIGN KEY (`candidat_id`) REFERENCES `candidats` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `programme_formations`
--
ALTER TABLE `programme_formations`
  ADD CONSTRAINT `programme_formations_ibfk_1` FOREIGN KEY (`formation_id`) REFERENCES `formations` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `progression_candidats`
--
ALTER TABLE `progression_candidats`
  ADD CONSTRAINT `progression_candidats_ibfk_1` FOREIGN KEY (`candidat_id`) REFERENCES `candidats` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `progression_candidats_ibfk_2` FOREIGN KEY (`formation_id`) REFERENCES `formations` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `progression_candidats_ibfk_3` FOREIGN KEY (`module_id`) REFERENCES `modules_formation` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `questions`
--
ALTER TABLE `questions`
  ADD CONSTRAINT `questions_ibfk_1` FOREIGN KEY (`formation_id`) REFERENCES `formations` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `questions_ibfk_2` FOREIGN KEY (`etudiant_id`) REFERENCES `users` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `questions_quiz`
--
ALTER TABLE `questions_quiz`
  ADD CONSTRAINT `questions_quiz_ibfk_1` FOREIGN KEY (`quiz_id`) REFERENCES `quiz` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `quiz`
--
ALTER TABLE `quiz`
  ADD CONSTRAINT `quiz_ibfk_1` FOREIGN KEY (`formation_id`) REFERENCES `formations` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `reponses_quiz`
--
ALTER TABLE `reponses_quiz`
  ADD CONSTRAINT `reponses_quiz_ibfk_1` FOREIGN KEY (`question_id`) REFERENCES `questions_quiz` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `seances`
--
ALTER TABLE `seances`
  ADD CONSTRAINT `fk_seance_module` FOREIGN KEY (`module_id`) REFERENCES `modules_formation` (`id`) ON DELETE SET NULL,
  ADD CONSTRAINT `seances_ibfk_1` FOREIGN KEY (`formation_id`) REFERENCES `formations` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `supports`
--
ALTER TABLE `supports`
  ADD CONSTRAINT `supports_ibfk_1` FOREIGN KEY (`formation_id`) REFERENCES `formations` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `tentatives_quiz`
--
ALTER TABLE `tentatives_quiz`
  ADD CONSTRAINT `tentatives_quiz_ibfk_1` FOREIGN KEY (`quiz_id`) REFERENCES `quiz` (`id`) ON DELETE CASCADE;
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
