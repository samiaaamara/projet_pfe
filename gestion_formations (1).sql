-- phpMyAdmin SQL Dump
-- version 5.2.1
-- https://www.phpmyadmin.net/
--
-- Hôte : 127.0.0.1
-- Généré le : ven. 17 avr. 2026 à 10:42
-- Version du serveur : 10.4.32-MariaDB
-- Version de PHP : 8.0.30

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

--
-- Base de données : `gestion_formations`
--

-- --------------------------------------------------------

--
-- Structure de la table `admins`
--

CREATE TABLE `admins` (
  `id` int(11) NOT NULL,
  `user_id` int(11) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Déchargement des données de la table `admins`
--

INSERT INTO `admins` (`id`, `user_id`) VALUES
(1, 1);

-- --------------------------------------------------------

--
-- Structure de la table `etudiants`
--

CREATE TABLE `etudiants` (
  `id` int(11) NOT NULL,
  `user_id` int(11) NOT NULL,
  `progression` int(11) DEFAULT 0,
  `departement` varchar(100) DEFAULT NULL,
  `niveau` varchar(50) DEFAULT NULL,
  `specialite` varchar(100) DEFAULT NULL,
  `cin` varchar(20) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Déchargement des données de la table `etudiants`
--

INSERT INTO `etudiants` (`id`, `user_id`, `progression`, `departement`, `niveau`, `specialite`, `cin`) VALUES
(1, 9, 0, NULL, NULL, NULL, NULL),
(2, 13, 0, NULL, NULL, NULL, NULL),
(3, 15, 0, NULL, NULL, NULL, NULL),
(4, 18, 0, NULL, NULL, NULL, NULL),
(5, 20, 0, NULL, NULL, NULL, NULL),
(6, 34, 0, NULL, NULL, NULL, NULL);

-- --------------------------------------------------------

--
-- Structure de la table `formateurs`
--

CREATE TABLE `formateurs` (
  `id` int(11) NOT NULL,
  `user_id` int(11) NOT NULL,
  `specialite` varchar(100) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Déchargement des données de la table `formateurs`
--

INSERT INTO `formateurs` (`id`, `user_id`, `specialite`) VALUES
(1, 10, NULL),
(2, 3, 'Développement Web'),
(3, 35, 'Angular'),
(4, 37, 'Spring Boot');

-- --------------------------------------------------------

--
-- Structure de la table `formations`
--

CREATE TABLE `formations` (
  `id` int(11) NOT NULL,
  `titre` varchar(150) NOT NULL,
  `description` text DEFAULT NULL,
  `date_debut` date DEFAULT NULL,
  `formateur_id` int(11) NOT NULL,
  `departement` varchar(100) DEFAULT NULL,
  `status` varchar(20) DEFAULT 'draft',
  `date_fin` date DEFAULT NULL,
  `duree` int(11) DEFAULT NULL,
  `niveau` varchar(50) DEFAULT NULL,
  `nb_places` int(11) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Déchargement des données de la table `formations`
--

INSERT INTO `formations` (`id`, `titre`, `description`, `date_debut`, `formateur_id`, `departement`, `status`, `date_fin`, `duree`, `niveau`, `nb_places`) VALUES
(6, 'Angular Débutant', 'Introduction à Angular', '2026-02-10', 1, 'Informatique', 'draft', NULL, NULL, NULL, NULL),
(7, 'Node.js', 'Backend avec Node.js', '2026-02-15', 1, 'Informatique', 'draft', NULL, NULL, NULL, NULL),
(8, 'Sécurité Web', 'Bases de la sécurité web', '2026-02-19', 1, 'Génie Civil', 'published', '0000-00-00', 0, '', 0),
(13, 'Introduction à Django', 'Apprendre à créer une application web avec Django et MySQL', '2026-05-15', 3, 'Informatique', 'draft', '2026-05-25', 40, 'Débutant', 15);

-- --------------------------------------------------------

--
-- Structure de la table `inscriptions`
--

CREATE TABLE `inscriptions` (
  `id` int(11) NOT NULL,
  `etudiant_id` int(11) NOT NULL,
  `formation_id` int(11) NOT NULL,
  `date_inscription` date DEFAULT curdate(),
  `statut` varchar(50) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Déchargement des données de la table `inscriptions`
--

INSERT INTO `inscriptions` (`id`, `etudiant_id`, `formation_id`, `date_inscription`, `statut`) VALUES
(3, 1, 6, '2026-02-17', 'Inscrit'),
(4, 1, 7, '2026-02-17', 'Inscrit'),
(5, 1, 8, '2026-02-17', 'Inscrit');

-- --------------------------------------------------------

--
-- Structure de la table `supports`
--

CREATE TABLE `supports` (
  `id` int(11) NOT NULL,
  `type` varchar(50) DEFAULT NULL,
  `fichier` varchar(255) DEFAULT NULL,
  `formation_id` int(11) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Structure de la table `users`
--

CREATE TABLE `users` (
  `id` int(11) NOT NULL,
  `nom` varchar(100) NOT NULL,
  `email` varchar(150) NOT NULL,
  `mot_de_passe` varchar(255) NOT NULL,
  `role` enum('etudiant','formateur','admin') NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Déchargement des données de la table `users`
--

INSERT INTO `users` (`id`, `nom`, `email`, `mot_de_passe`, `role`) VALUES
(1, '', '', '', 'formateur'),
(2, 'amara samiaa', 'samiaa.amara@gmail.com', 'samiaa321', 'etudiant'),
(3, 'ranim jemai', 'ranimjemai@gmail.com', 'ranim321', 'formateur'),
(4, 'ghraba eya', 'ghrabaeya@gmail.com', '$2b$10$bIKhNi/Zq9pAopx7GP/dkOgR9tyUDBj1VHSYMCghBBFGsgZlHp9X2', 'etudiant'),
(9, 'medamara', 'medamara@gmail.com', '$2b$10$Qtz3R13qwZErKhez/NNKIe3dZtT0gFOoAkQaGUlGxXNvqKwqVo5P6', 'etudiant'),
(10, 'sofien ben mahmoud', 'sofienbenmahmoud@gmail.com', '$2b$10$WhUFrtoH0IzJQ4W3Jni9TuwtDH1Oua1VZPDpp7FZPwJg69M.Y76WC', 'formateur'),
(13, '', 'teacher@iset.tn', '$2b$10$.g7F/aThubSrN1gFdvpslOpjKBpMjW3jWI3kZ1kPeSd1rux8cgH8C', 'etudiant'),
(15, 'samiaa amara', 'samiaa.amara50@gmail.com', '$2b$10$jBdJewEGM2jScPeBYOt0veK9k8lWFBcPsSyZohWwBys2Oz3Cmnkly', 'etudiant'),
(18, 'amel derouich ', 'derouichamel@gmail.com', '$2b$10$ctsM1goqLDnRvSJA8abK0O/SrdcaN7i4himYysneyU2OtaD0MWgR.', 'etudiant'),
(20, 'samiaa amara', 'samiaa.amara50', '$2b$10$GZHya0eU1v1yIlEJ6Z89Yuz41BTN5iTlKXdlUI4p2kGoQgNuDSJau', 'etudiant'),
(34, 'samiaa amara', 'samiaa.amara44@gmail.com', '$2b$10$DbAo1Ii3HOMaTXEmxkhhieGYtz.cO2h6XaEMzguTcUqo60a/dEXva', 'etudiant'),
(35, 'sabeh jari', 'sabehjari44@gmail.com', '$2b$10$SqoKOBceZZGktZEMI8s7Ce2SXwwPZtwCW955xJJXKjKznXGARVq6W', 'formateur'),
(36, 'Admin', 'admin@gmail.com', '$2b$10$MNETw.gLMhww7556DEt6t.jHivP97u59eYc12z7VVdxk6nzdM9HTu', 'admin'),
(37, 'formateur', 'formateur55@gmail.com', '$2b$10$YysxzCqYtBqvsQ0/tivsveW2cC21CYGhS32TCPXE8sIl6gZhkaM6C', 'formateur');

--
-- Index pour les tables déchargées
--

--
-- Index pour la table `admins`
--
ALTER TABLE `admins`
  ADD PRIMARY KEY (`id`),
  ADD KEY `user_id` (`user_id`);

--
-- Index pour la table `etudiants`
--
ALTER TABLE `etudiants`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `cin` (`cin`),
  ADD KEY `user_id` (`user_id`);

--
-- Index pour la table `formateurs`
--
ALTER TABLE `formateurs`
  ADD PRIMARY KEY (`id`),
  ADD KEY `user_id` (`user_id`);

--
-- Index pour la table `formations`
--
ALTER TABLE `formations`
  ADD PRIMARY KEY (`id`),
  ADD KEY `formateur_id` (`formateur_id`);

--
-- Index pour la table `inscriptions`
--
ALTER TABLE `inscriptions`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `etudiant_id` (`etudiant_id`,`formation_id`),
  ADD KEY `formation_id` (`formation_id`);

--
-- Index pour la table `supports`
--
ALTER TABLE `supports`
  ADD PRIMARY KEY (`id`),
  ADD KEY `formation_id` (`formation_id`);

--
-- Index pour la table `users`
--
ALTER TABLE `users`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `email` (`email`);

--
-- AUTO_INCREMENT pour les tables déchargées
--

--
-- AUTO_INCREMENT pour la table `admins`
--
ALTER TABLE `admins`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=2;

--
-- AUTO_INCREMENT pour la table `etudiants`
--
ALTER TABLE `etudiants`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=7;

--
-- AUTO_INCREMENT pour la table `formateurs`
--
ALTER TABLE `formateurs`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=5;

--
-- AUTO_INCREMENT pour la table `formations`
--
ALTER TABLE `formations`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=14;

--
-- AUTO_INCREMENT pour la table `inscriptions`
--
ALTER TABLE `inscriptions`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=14;

--
-- AUTO_INCREMENT pour la table `supports`
--
ALTER TABLE `supports`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=3;

--
-- AUTO_INCREMENT pour la table `users`
--
ALTER TABLE `users`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=38;

--
-- Contraintes pour les tables déchargées
--

--
-- Contraintes pour la table `admins`
--
ALTER TABLE `admins`
  ADD CONSTRAINT `admins_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE;

--
-- Contraintes pour la table `etudiants`
--
ALTER TABLE `etudiants`
  ADD CONSTRAINT `etudiants_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE;

--
-- Contraintes pour la table `formateurs`
--
ALTER TABLE `formateurs`
  ADD CONSTRAINT `formateurs_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE;

--
-- Contraintes pour la table `formations`
--
ALTER TABLE `formations`
  ADD CONSTRAINT `formations_ibfk_1` FOREIGN KEY (`formateur_id`) REFERENCES `formateurs` (`id`) ON DELETE CASCADE;

--
-- Contraintes pour la table `inscriptions`
--
ALTER TABLE `inscriptions`
  ADD CONSTRAINT `inscriptions_ibfk_1` FOREIGN KEY (`etudiant_id`) REFERENCES `etudiants` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `inscriptions_ibfk_2` FOREIGN KEY (`formation_id`) REFERENCES `formations` (`id`) ON DELETE CASCADE;

--
-- Contraintes pour la table `supports`
--
ALTER TABLE `supports`
  ADD CONSTRAINT `supports_ibfk_1` FOREIGN KEY (`formation_id`) REFERENCES `formations` (`id`) ON DELETE CASCADE;
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
