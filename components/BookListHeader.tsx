import React from 'react';
import { View, Text, TouchableOpacity, TextInput, FlatList, StyleSheet } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';

interface BookListHeaderProps {
  showSearch: boolean;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  setShowSearch: (show: boolean) => void;
  showFavorites: boolean;
  setShowFavorites: (show: boolean) => void;
  favoritesCount: number;
  showFilter: boolean;
  setShowFilter: (show: boolean) => void;
  showOptions: boolean;
  setShowOptions: (show: boolean) => void;
  categories: string[];
  selectedCategory: string;
  setSelectedCategory: (category: string) => void;
  setShowAllCategories: (show: boolean) => void;
  sortBy: string;
  setSortBy: (sort: 'date' | 'title' | 'author') => void;
}

export default function BookListHeader({
  showSearch,
  searchQuery,
  setSearchQuery,
  setShowSearch,
  showFavorites,
  setShowFavorites,
  favoritesCount,
  showFilter,
  setShowFilter,
  showOptions,
  setShowOptions,
  categories,
  selectedCategory,
  setSelectedCategory,
  setShowAllCategories,
  sortBy,
  setSortBy,
}: BookListHeaderProps) {
  return (
    <View style={styles.categoryWrapper}>
      <View style={styles.optionsHeader}>
        <View style={styles.leftActions}>
          {showSearch ? (
            <View style={styles.searchContainer}>
              <MaterialIcons name="search" size={20} color="#64748B" />
              <TextInput
                style={styles.searchInput}
                placeholder="Search books..."
                value={searchQuery}
                onChangeText={setSearchQuery}
                autoFocus
              />
              {searchQuery.length > 0 && (
                <TouchableOpacity
                  style={styles.clearButton}
                  onPress={() => setSearchQuery('')}
                >
                  <MaterialIcons name="close" size={20} color="#64748B" />
                </TouchableOpacity>
              )}
            </View>
          ) : (
            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => setShowSearch(true)}
            >
              <MaterialIcons name="search" size={24} color="#64748B" />
            </TouchableOpacity>
          )}
        </View>

        <View style={styles.rightActions}>
          <TouchableOpacity
            style={[styles.actionButton, showFavorites && styles.actionButtonActive]}
            onPress={() => {
              setShowFavorites(!showFavorites);
              setSelectedCategory('All');
            }}
          >
            <MaterialIcons
              name="favorite"
              size={24}
              color={showFavorites ? '#FFFFFF' : '#64748B'}
            />
            {favoritesCount > 0 && (
              <View style={styles.favoriteBadge}>
                <Text style={styles.favoriteBadgeText}>{favoritesCount}</Text>
              </View>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionButton, showFilter && styles.actionButtonActive]}
            onPress={() => setShowFilter(!showFilter)}
          >
            <MaterialIcons
              name="filter-list"
              size={24}
              color={showFilter ? '#FFFFFF' : '#64748B'}
            />
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionButton, showOptions && styles.actionButtonActive]}
            onPress={() => setShowOptions(!showOptions)}
          >
            <MaterialIcons
              name="more-vert"
              size={24}
              color={showOptions ? '#FFFFFF' : '#64748B'}
            />
          </TouchableOpacity>
        </View>
      </View>

      {showFilter && (
        <View style={styles.filterMenu}>
          <TouchableOpacity
            style={styles.optionItem}
            onPress={() => {
              setSortBy('date');
              setShowFilter(false);
            }}
          >
            <MaterialIcons name="access-time" size={20} color="#64748B" />
            <Text style={styles.optionText}>Date</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.optionItem}
            onPress={() => {
              setSortBy('title');
              setShowFilter(false);
            }}
          >
            <MaterialIcons name="sort-by-alpha" size={20} color="#64748B" />
            <Text style={styles.optionText}>Title</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.optionItem}
            onPress={() => {
              setSortBy('author');
              setShowFilter(false);
            }}
          >
            <MaterialIcons name="person" size={20} color="#64748B" />
            <Text style={styles.optionText}>Author</Text>
          </TouchableOpacity>
        </View>
      )}

      <View style={styles.categoryHeader}>
        <FlatList
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.mainCategoryRow}
          data={categories}
          keyExtractor={item => item}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={[
                styles.categoryChip,
                selectedCategory === item && styles.categoryChipSelected,
              ]}
              onPress={() => {
                setSelectedCategory(item);
                setShowAllCategories(false);
                setShowFavorites(false);
              }}
            >
              <Text 
                style={[
                  styles.categoryChipText,
                  selectedCategory === item && styles.categoryChipTextSelected
                ]}
                numberOfLines={1}
              >
                {item}
              </Text>
            </TouchableOpacity>
          )}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  categoryWrapper: {
    backgroundColor: '#FFFFFF',
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
    zIndex: 10,
  },
  optionsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  leftActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  rightActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  actionButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginHorizontal: 4,
    backgroundColor: '#EFF6FF',
  },
  actionButtonActive: {
    backgroundColor: '#2563EB',
  },
  searchContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EFF6FF',
    borderRadius: 20,
    paddingHorizontal: 12,
    height: 40,
    minWidth: 200,
  },
  searchInput: {
    flex: 1,
    height: 40,
    fontSize: 16,
    color: '#1E293B',
    marginLeft: 8,
  },
  clearButton: {
    padding: 4,
  },
  favoriteBadge: {
    position: 'absolute',
    top: -5,
    right: -5,
    backgroundColor: '#E53935',
    borderRadius: 10,
    width: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  favoriteBadgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: 'bold',
  },
  filterMenu: {
    position: 'absolute',
    top: 60,
    right: 16,
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    padding: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    zIndex: 2,
    width: 180,
  },
  optionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 4,
  },
  optionText: {
    marginLeft: 12,
    fontSize: 14,
    color: '#1E293B',
  },
  categoryHeader: {
    paddingTop: 8,
  },
  mainCategoryRow: {
    paddingHorizontal: 16,
  },
  categoryChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: '#F1F5F9',
    marginRight: 8,
  },
  categoryChipSelected: {
    backgroundColor: '#2563EB',
  },
  categoryChipText: {
    fontSize: 14,
    color: '#64748B',
  },
  categoryChipTextSelected: {
    color: '#FFFFFF',
  },
});