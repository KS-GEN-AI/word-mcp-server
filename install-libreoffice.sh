#!/bin/bash
set -e

if [[ "$OSTYPE" == "darwin"* ]]; then
  echo "Detected macOS. Installing LibreOffice with Homebrew..."
  if ! command -v brew &> /dev/null; then
    echo "Homebrew n'est pas installé. Installe-le d'abord : https://brew.sh/"
    exit 1
  fi
  brew install --cask libreoffice
elif [[ "$OSTYPE" == "linux-gnu"* ]]; then
  echo "Detected Linux. Installing LibreOffice with apt..."
  if ! command -v sudo &> /dev/null; then
    echo "sudo n'est pas disponible. Installe-le d'abord."
    exit 1
  fi
  sudo apt update && sudo apt install -y libreoffice
else
  echo "OS non supporté automatiquement. Installe LibreOffice manuellement."
  exit 1
fi

echo "LibreOffice installé ! La commande 'soffice' devrait être disponible." 