import React, { createContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface Book {
  id: string;
  title: string;
  author: string;
  category: string;
  uploadedAt: {
    toDate: () => Date;
  };
  url: string;
  description?: string;
}

interface FavoritesContextType {
  favorites: Book[];
  toggleFavorite: (book: Book) => Promise<void>;
}

export const FavoritesContext = createContext<FavoritesContextType>({
  favorites: [],
  toggleFavorite: async (book: Book) => {},
});

export const FavoritesProvider = ({ children }: { children: React.ReactNode }) => {
  const [favorites, setFavorites] = useState<Book[]>([]);

  useEffect(() => {
    const loadFavorites = async () => {
      try {
        const storedFavorites = await AsyncStorage.getItem('favorites');
        if (storedFavorites) {
          const parsedFavorites = JSON.parse(storedFavorites);
          setFavorites(parsedFavorites);
        }
      } catch (error) {
        console.error('Error loading favorites:', error);
      }
    };
    
    loadFavorites();
  }, []);

  const toggleFavorite = async (book: Book): Promise<void> => {
    try {
      const isFavorite = favorites.some((fav) => fav.id === book.id);
      
      let updatedFavorites: Book[];
      if (isFavorite) {
        updatedFavorites = favorites.filter((fav) => fav.id !== book.id);
      } else {
        updatedFavorites = [...favorites, book];
      }
      
      setFavorites(updatedFavorites);
      await AsyncStorage.setItem('favorites', JSON.stringify(updatedFavorites));
      
      return Promise.resolve();
    } catch (error) {
      console.error('Error in toggleFavorite:', error);
      return Promise.reject(error);
    }
  };

  return (
    <FavoritesContext.Provider value={{ favorites, toggleFavorite }}>
      {children}
    </FavoritesContext.Provider>
  );
};