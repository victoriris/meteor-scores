import { createAsyncThunk, createSlice, isFulfilled, isPending, isRejected } from "@reduxjs/toolkit";
import numeral from "numeral";
import { CREATE_ITEM, DELETE_ITEM, UNVOTE_ITEM, VOTE_ITEM } from "../graphql/mutations";
import { ITEMS } from "../graphql/queries";
import client from "../lib/apolloClient";
import { Item } from "../types/common";
import { createItem, createItemVariables } from "../types/graphql/createItem";
import { deleteItem, deleteItemVariables } from "../types/graphql/deleteItem";
import { CreateItemInput, ItemWhereUniqueInput } from "../types/graphql/globalTypes";
import { items, items_items } from "../types/graphql/items";
import { unvoteItem, unvoteItemVariables } from "../types/graphql/unvoteItem";
import { voteItem, voteItemVariables } from "../types/graphql/voteItem";
import { RootState } from "./index";

const SLICE_NAME = "sampleFeature";

type ItemsList = {
	items: items_items[];
	loading: boolean;
	creating: boolean;
	deleting: boolean;
	voting: boolean;
};

const initialState: ItemsList = {
	items: [],
	loading: false,
	voting: false,
	creating: false,
	deleting: false,
};

export const getItems = createAsyncThunk(
	`${SLICE_NAME}/sampleAction`,
	async () => {
		const { data } = await client.query<items>({
			query: ITEMS,
		});
		return data.items;
	}
);

export const addNewItem = createAsyncThunk(`${SLICE_NAME}/addNewItem`, async (input: CreateItemInput) => {
	const { data } = await client.mutate<createItem, createItemVariables>({
		mutation: CREATE_ITEM,
		variables: {
			input
		}
	});
	return data?.createItem;
});

export const removeItem = createAsyncThunk(`${SLICE_NAME}/removeItem`, async (input: ItemWhereUniqueInput) => {
	const { data } = await client.mutate<deleteItem, deleteItemVariables>({
		mutation: DELETE_ITEM,
		variables: {
			input
		}
	});
	return data?.deleteItem;
});

export const addVote = createAsyncThunk(`${SLICE_NAME}/addVote`, async (args: {itemId: string}) => {
	const { data } = await client.mutate<voteItem, voteItemVariables>({
		mutation: VOTE_ITEM,
		variables: {
			input: {
				id: args.itemId
			}
		}
	});
	return data?.voteItem;
});

export const removeVote = createAsyncThunk(
	`${SLICE_NAME}/removeVote`,
	async (args: {itemId: string}) => {
		const { data } = await client.mutate<unvoteItem, unvoteItemVariables>({
			mutation: UNVOTE_ITEM,
			variables: {
				input: {
					id: args.itemId
				}
			}
		});
		return data?.unvoteItem;
	}
);

export const slice = createSlice({
	name: SLICE_NAME,
	initialState,
	reducers: {},
	extraReducers: (builder) => {
		builder.addCase(getItems.pending, (state, action) => {
			state.loading = true;
		});
		builder.addCase(getItems.fulfilled, (state, action) => {
			state.loading = false;
			state.items = action.payload!;
		});
		builder.addCase(getItems.rejected, (state, action) => {
			state.loading = false;
		});
		builder.addCase(addNewItem.pending, (state, action) => {
			state.creating = true;
		});
		builder.addCase(addNewItem.fulfilled, (state, action) => {
			state.creating = false;
			state.items.push(action.payload!);
		});
		builder.addCase(addNewItem.rejected, (state, action) => {
			state.creating = false;
		});
		builder.addCase(removeItem.pending, (state, action) => {
			state.deleting = true;
		});
		builder.addCase(removeItem.fulfilled, (state, action) => {
			state.deleting = false;
			state.items = state.items.filter(i => i.id !== action.payload?.id)
		});
		builder.addCase(removeItem.rejected, (state, action) => {
			state.deleting = false;
		});
		builder.addMatcher(isPending(addVote, removeVote), (state, action) => {
			state.voting = true;
		});
		builder.addMatcher(isFulfilled(addVote, removeVote), (state, action) => {
			const idx = state.items.findIndex(i => i.id === action.payload?.id);
			state.items[idx].score = action.payload?.score!
			state.voting = false
		});
		builder.addMatcher(isRejected(addVote, removeVote), (state, action) => {
			state.voting = false
		});
	},
});

export default slice.reducer;
export const {} = slice.actions;
export const selectItemsList = (state: RootState) => state.itemsList;
export const selectItems = (state: RootState): Item[] => {
	let rank = 1;
	const { items } = state.itemsList;
	const sortedItems = [...items]
	sortedItems.sort((a, b) => a.score < b.score ? 1 : -1)
	return sortedItems.map((item, index) => {
		if (index !== 0 && items[index - 1].score > item.score) {
			rank++;
		}

		return {
			...item,
			rank,
			position: numeral(rank).format("0o"),
		};
	});
};
