-- MySQL dump 10.13  Distrib 8.0.46, for Win64 (x86_64)
--
-- Host: nearbites-3cef3411-nearbites1.c.aivencloud.com    Database: main
-- ------------------------------------------------------
-- Server version	8.0.45

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!50503 SET NAMES utf8 */;
/*!40103 SET @OLD_TIME_ZONE=@@TIME_ZONE */;
/*!40103 SET TIME_ZONE='+00:00' */;
/*!40014 SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0 */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;
SET @MYSQLDUMP_TEMP_LOG_BIN = @@SESSION.SQL_LOG_BIN;
SET @@SESSION.SQL_LOG_BIN= 0;

--
-- GTID state at the beginning of the backup 
--

SET @@GLOBAL.GTID_PURGED=/*!80000 '+'*/ '845a35e3-3fb5-11f1-b2c1-da523c0a724a:1-40,
9872767b-413e-11f1-9a04-e6c601b66615:1-69';

--
-- Table structure for table `Food`
--

DROP TABLE IF EXISTS `Food`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `Food` (
  `foodId` int NOT NULL,
  `servedAt` int NOT NULL,
  `foodName` varchar(35) NOT NULL,
  `description` text NOT NULL,
  `foodPrice` decimal(10,2) NOT NULL,
  `foodRating` decimal(2,1) DEFAULT NULL,
  `isQuickServe` tinyint(1) NOT NULL,
  `carbs` decimal(5,2) DEFAULT '0.00',
  `calories` decimal(5,2) DEFAULT '0.00',
  `imageUrl` varchar(255) DEFAULT NULL,
  PRIMARY KEY (`foodId`),
  KEY `servedAt` (`servedAt`),
  CONSTRAINT `Food_ibfk_1` FOREIGN KEY (`servedAt`) REFERENCES `Stores` (`storeId`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `Food`
--

LOCK TABLES `Food` WRITE;
/*!40000 ALTER TABLE `Food` DISABLE KEYS */;
/*!40000 ALTER TABLE `Food` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `Food_Ingredients`
--

DROP TABLE IF EXISTS `Food_Ingredients`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `Food_Ingredients` (
  `FoodId` int NOT NULL,
  `IngredientId` int NOT NULL,
  PRIMARY KEY (`FoodId`,`IngredientId`),
  KEY `IngredientId` (`IngredientId`),
  CONSTRAINT `Food_Ingredients_ibfk_1` FOREIGN KEY (`FoodId`) REFERENCES `Food` (`foodId`),
  CONSTRAINT `Food_Ingredients_ibfk_2` FOREIGN KEY (`IngredientId`) REFERENCES `Ingredients` (`IngredientId`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `Food_Ingredients`
--

LOCK TABLES `Food_Ingredients` WRITE;
/*!40000 ALTER TABLE `Food_Ingredients` DISABLE KEYS */;
/*!40000 ALTER TABLE `Food_Ingredients` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `Food_Pairings`
--

DROP TABLE IF EXISTS `Food_Pairings`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `Food_Pairings` (
  `pairingId` int NOT NULL AUTO_INCREMENT,
  `primaryFoodId` int NOT NULL,
  `pairedFoodId` int NOT NULL,
  PRIMARY KEY (`pairingId`),
  KEY `primaryFoodId` (`primaryFoodId`),
  KEY `pairedFoodId` (`pairedFoodId`),
  CONSTRAINT `Food_Pairings_ibfk_1` FOREIGN KEY (`primaryFoodId`) REFERENCES `Food` (`foodId`) ON DELETE CASCADE,
  CONSTRAINT `Food_Pairings_ibfk_2` FOREIGN KEY (`pairedFoodId`) REFERENCES `Food` (`foodId`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `Food_Pairings`
--

LOCK TABLES `Food_Pairings` WRITE;
/*!40000 ALTER TABLE `Food_Pairings` DISABLE KEYS */;
/*!40000 ALTER TABLE `Food_Pairings` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `Food_Tags`
--

DROP TABLE IF EXISTS `Food_Tags`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `Food_Tags` (
  `foodId` int NOT NULL,
  `tagId` int NOT NULL,
  PRIMARY KEY (`foodId`,`tagId`),
  KEY `tagId` (`tagId`),
  CONSTRAINT `Food_Tags_ibfk_1` FOREIGN KEY (`foodId`) REFERENCES `Food` (`foodId`),
  CONSTRAINT `Food_Tags_ibfk_2` FOREIGN KEY (`tagId`) REFERENCES `Tags` (`tagId`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `Food_Tags`
--

LOCK TABLES `Food_Tags` WRITE;
/*!40000 ALTER TABLE `Food_Tags` DISABLE KEYS */;
/*!40000 ALTER TABLE `Food_Tags` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `Ingredients`
--

DROP TABLE IF EXISTS `Ingredients`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `Ingredients` (
  `IngredientId` int NOT NULL,
  `ingredientName` varchar(35) NOT NULL,
  PRIMARY KEY (`IngredientId`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `Ingredients`
--

LOCK TABLES `Ingredients` WRITE;
/*!40000 ALTER TABLE `Ingredients` DISABLE KEYS */;
/*!40000 ALTER TABLE `Ingredients` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `MealPlanEntries`
--

DROP TABLE IF EXISTS `MealPlanEntries`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `MealPlanEntries` (
  `entryId` int NOT NULL AUTO_INCREMENT,
  `planId` int NOT NULL,
  `foodId` int NOT NULL,
  `dayOfWeek` smallint NOT NULL,
  `mealType` varchar(35) NOT NULL,
  PRIMARY KEY (`entryId`),
  KEY `planId` (`planId`),
  KEY `foodId` (`foodId`),
  CONSTRAINT `MealPlanEntries_ibfk_1` FOREIGN KEY (`planId`) REFERENCES `MealPlans` (`planId`),
  CONSTRAINT `MealPlanEntries_ibfk_2` FOREIGN KEY (`foodId`) REFERENCES `Food` (`foodId`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `MealPlanEntries`
--

LOCK TABLES `MealPlanEntries` WRITE;
/*!40000 ALTER TABLE `MealPlanEntries` DISABLE KEYS */;
/*!40000 ALTER TABLE `MealPlanEntries` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `MealPlans`
--

DROP TABLE IF EXISTS `MealPlans`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `MealPlans` (
  `planId` int NOT NULL AUTO_INCREMENT,
  `userId` int NOT NULL,
  `planName` varchar(35) NOT NULL,
  `startDate` date NOT NULL,
  PRIMARY KEY (`planId`),
  KEY `userId` (`userId`),
  CONSTRAINT `MealPlans_ibfk_1` FOREIGN KEY (`userId`) REFERENCES `Users` (`userId`)
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `MealPlans`
--

LOCK TABLES `MealPlans` WRITE;
/*!40000 ALTER TABLE `MealPlans` DISABLE KEYS */;
INSERT INTO `MealPlans` VALUES (1,4,'AI Generated Weekly Plan','2026-04-26'),(2,13,'AI Generated Weekly Plan','2026-04-26');
/*!40000 ALTER TABLE `MealPlans` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `Preferences`
--

DROP TABLE IF EXISTS `Preferences`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `Preferences` (
  `preferenceId` int NOT NULL AUTO_INCREMENT,
  `userId` int NOT NULL,
  `preferenceType` varchar(20) NOT NULL,
  `tagId` int DEFAULT NULL,
  `ingredientId` int DEFAULT NULL,
  `maxBudget` decimal(10,2) DEFAULT NULL,
  `description` varchar(255) DEFAULT NULL,
  PRIMARY KEY (`preferenceId`),
  KEY `userId` (`userId`),
  KEY `tagId` (`tagId`),
  KEY `ingredientId` (`ingredientId`),
  CONSTRAINT `Preferences_ibfk_1` FOREIGN KEY (`userId`) REFERENCES `Users` (`userId`),
  CONSTRAINT `Preferences_ibfk_2` FOREIGN KEY (`tagId`) REFERENCES `Tags` (`tagId`),
  CONSTRAINT `Preferences_ibfk_3` FOREIGN KEY (`ingredientId`) REFERENCES `Ingredients` (`IngredientId`)
) ENGINE=InnoDB AUTO_INCREMENT=14 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `Preferences`
--

LOCK TABLES `Preferences` WRITE;
/*!40000 ALTER TABLE `Preferences` DISABLE KEYS */;
INSERT INTO `Preferences` VALUES (1,6,'BUDGET',NULL,NULL,67.00,NULL),(2,7,'BUDGET',NULL,NULL,67.00,NULL),(3,7,'TAG',NULL,NULL,NULL,NULL),(4,7,'BUDGET',NULL,NULL,67.00,NULL),(5,7,'TAG',NULL,NULL,NULL,NULL),(6,8,'BUDGET',NULL,NULL,123123.00,NULL),(7,8,'TAG',NULL,NULL,NULL,NULL),(8,10,'BUDGET',NULL,NULL,3000.00,NULL),(9,10,'TAG',NULL,NULL,NULL,NULL),(10,10,'TAG',NULL,NULL,NULL,NULL),(11,13,'BUDGET',NULL,NULL,12.00,NULL),(12,13,'TAG',NULL,NULL,NULL,NULL),(13,13,'TAG',NULL,NULL,NULL,NULL);
/*!40000 ALTER TABLE `Preferences` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `Reviews`
--

DROP TABLE IF EXISTS `Reviews`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `Reviews` (
  `reviewId` int NOT NULL AUTO_INCREMENT,
  `userId` int NOT NULL,
  `foodId` int NOT NULL,
  `starRating` decimal(2,1) NOT NULL,
  PRIMARY KEY (`reviewId`),
  KEY `userId` (`userId`),
  KEY `foodId` (`foodId`),
  CONSTRAINT `Reviews_ibfk_1` FOREIGN KEY (`userId`) REFERENCES `Users` (`userId`),
  CONSTRAINT `Reviews_ibfk_2` FOREIGN KEY (`foodId`) REFERENCES `Food` (`foodId`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `Reviews`
--

LOCK TABLES `Reviews` WRITE;
/*!40000 ALTER TABLE `Reviews` DISABLE KEYS */;
/*!40000 ALTER TABLE `Reviews` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `Stores`
--

DROP TABLE IF EXISTS `Stores`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `Stores` (
  `storeId` int NOT NULL AUTO_INCREMENT,
  `storeName` varchar(255) NOT NULL,
  `storeManager` int NOT NULL,
  `storeRating` decimal(2,0) DEFAULT NULL,
  `storeLocation` varchar(20) NOT NULL,
  `storeImage` varchar(255) DEFAULT NULL,
  PRIMARY KEY (`storeId`),
  KEY `fk_store_manager` (`storeManager`),
  CONSTRAINT `fk_store_manager` FOREIGN KEY (`storeManager`) REFERENCES `Users` (`userId`) ON DELETE CASCADE,
  CONSTRAINT `Stores_ibfk_1` FOREIGN KEY (`storeManager`) REFERENCES `Users` (`userId`)
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `Stores`
--

LOCK TABLES `Stores` WRITE;
/*!40000 ALTER TABLE `Stores` DISABLE KEYS */;
INSERT INTO `Stores` VALUES (1,'Chawkeng 1',9,NULL,'Sotero Canteen',NULL),(2,'Chawkeng 2',9,NULL,'Circuit',NULL);
/*!40000 ALTER TABLE `Stores` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `Tags`
--

DROP TABLE IF EXISTS `Tags`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `Tags` (
  `tagId` int NOT NULL,
  `tagName` varchar(35) NOT NULL,
  `tagType` varchar(35) NOT NULL,
  PRIMARY KEY (`tagId`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `Tags`
--

LOCK TABLES `Tags` WRITE;
/*!40000 ALTER TABLE `Tags` DISABLE KEYS */;
/*!40000 ALTER TABLE `Tags` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `Users`
--

DROP TABLE IF EXISTS `Users`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `Users` (
  `userId` int NOT NULL AUTO_INCREMENT,
  `email` varchar(100) NOT NULL,
  `password` varchar(250) NOT NULL,
  `username` varchar(15) NOT NULL,
  `userType` smallint NOT NULL DEFAULT '1',
  PRIMARY KEY (`userId`),
  UNIQUE KEY `email` (`email`)
) ENGINE=InnoDB AUTO_INCREMENT=14 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `Users`
--

LOCK TABLES `Users` WRITE;
/*!40000 ALTER TABLE `Users` DISABLE KEYS */;
INSERT INTO `Users` VALUES (4,'juan@lpunetwork.edu.ph','$2b$10$LL9.KgvYr7SE/PUZGCgkDeDgofg3ozywoe9x5nYFjV3/B02cTXbuq','juan',3),(6,'pedro@lpunetwork.edu.ph','$2b$10$cTeKiA1Cd/HnSR4IDbf3x..ZV8dPTQDU9mgFuhiz88zslBbXZmHUO','Pedro',1),(7,'bob@lpunetwork.edu.ph','$2b$10$p0iOlXe7vHW4qgeWlGvwBOEKesqugVjAf/pjZHofqlFNyUILzhimm','bob',1),(8,'a@lpunetwork.edu.ph','$2b$10$I/UFcw.Z.4xxMu4Khf47MO3/vmxu265MDvG57lsjuWA/Pq2E2bhpq','a',1),(9,'chawkeng@gmail.com','$2b$10$Ru4MgGLW4rKSN1Zw7K2xIOhzh04FNhiZ1M9P5lLOb1PScqAWOgH4i','Chawkeng',2),(10,'test1@lpunetwork.edu.ph','$2b$10$AWrwnSvcngh9Nc6.ZBmKFe.FDKT5fQDJLeJj0MATWIHQN7dvIUbZC','juan',1),(11,'b@lpunetwork.edu.ph','$2b$10$az5rKVUYG6tT1qHG1LHveegoW.8tdwMa/TWMvD3WMqlgTSNHIh4dG','juan',1),(13,'c@lpunetwork.edu.ph','$2b$10$oafYGogLUEEK86ikqx9B2OI4xO/C19KwDGhnPkJYhYPUWasK8QE7e','juan',1);
/*!40000 ALTER TABLE `Users` ENABLE KEYS */;
UNLOCK TABLES;
SET @@SESSION.SQL_LOG_BIN = @MYSQLDUMP_TEMP_LOG_BIN;
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

-- Dump completed on 2026-04-27  0:33:31
